import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { loadMemeAssets, renderMemeFrame, calculateDimensions, applyDeepFry } from './renderService';
import { calculateGifLoopDuration, hasAnimatedText } from '../constants/textAnimations';

/**
 * Exports a meme as an MP4 video using WebCodecs and mp4-muxer
 * @param {Object} meme - The meme state
 * @param {Array} texts - Text overlays
 * @param {Array} stickers - Stickers
 * @param {Function} onProgress - Progress callback (percentage, statusMessage)
 * @returns {Promise<Blob>} - The generated MP4 blob
 */
/**
 * Exports a meme as an MP4 video using WebCodecs and mp4-muxer
 * @param {Object} meme - The meme state
 * @param {Array} texts - Text overlays
 * @param {Array} stickers - Stickers
 * @param {Function} onProgress - Progress callback (percentage, statusMessage)
 * @param {string} quality - Quality preset ('high', 'medium', 'low')
 * @returns {Promise<Blob>} - The generated MP4 blob
 */
export async function exportMemeAsMp4(meme, texts, stickers, onProgress, quality = 'medium') {
    if (!("VideoEncoder" in window)) {
        throw new Error("WebCodecs (VideoEncoder) is not supported in this browser.");
    }

    // 1. Load Assets
    if (onProgress) onProgress(10, "Loading assets...");
    const assets = await loadMemeAssets(meme, stickers);

    // 1b. Optimize Deep Fry (same as GIF)
    assets.friedImages = {};
    for (const panel of meme.panels) {
        if (assets.staticImages[panel.id] && (panel.filters?.deepFry || 0) > 0) {
            const imgSrc = assets.staticImages[panel.id];
            const canvas = document.createElement('canvas');
            canvas.width = imgSrc.width;
            canvas.height = imgSrc.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgSrc, 0, 0);
            applyDeepFry(ctx, 0, 0, canvas.width, canvas.height, panel.filters.deepFry);
            assets.friedImages[panel.id] = canvas;
        }
    }

    if (onProgress) onProgress(20, "Analyzing dimensions...");

    // 2. Calculate Dimensions
    let dimensions = calculateDimensions(meme, assets);
    let { exportWidth, exportHeight } = dimensions;

    // Apply Quality Scaling
    const QUALITY_SETTINGS = {
        high: { scale: 1.0, bitrate: 4_000_000 },
        medium: { scale: 0.75, bitrate: 1_500_000 },
        low: { scale: 0.5, bitrate: 800_000 }
    };
    const settings = QUALITY_SETTINGS[quality] || QUALITY_SETTINGS.medium;

    exportWidth = Math.round(exportWidth * settings.scale);
    exportHeight = Math.round(exportHeight * settings.scale);

    // MP4 specific: Dimensions must be even for H.264
    if (exportWidth % 2 !== 0) exportWidth++;
    if (exportHeight % 2 !== 0) exportHeight++;

    // Update dimensions object for renderMemeFrame
    dimensions = {
        ...dimensions,
        exportWidth,
        exportHeight
    };

    console.log(`Exporting MP4 (${quality}): ${exportWidth}x${exportHeight} @ ${settings.bitrate / 1000}kbps`);

    // 3. Determine Duration and FPS
    // For MP4, we want a smoother 30FPS vs GIF's 10FPS
    const FPS = 30;
    const FRAME_DURATION_MS = 1000 / FPS;
    const MAX_SHARING_DURATION_MS = 60000; // 60s max (1 minute) for full video support
    const MIN_DURATION_MS = 1000; // Minimum 1s (was 3s, now allow shorter clips)

    let durationMs = MIN_DURATION_MS;

    // Check textual animations
    if (hasAnimatedText(texts) || (stickers || []).some(s => s.animation && s.animation !== 'none')) {
        const animDuration = calculateGifLoopDuration(texts, stickers);
        durationMs = Math.max(durationMs, animDuration);
    }

    // Check GIF/Video panels
    Object.values(assets.gifProcessors).forEach(p => {
        if (p.getDuration) {
             const d = p.getDuration();
             if (d > 0) durationMs = Math.max(durationMs, d);
        }
    });

    // Cap duration
    durationMs = Math.min(durationMs, MAX_SHARING_DURATION_MS);

    // Ensure accurate frame count
    const totalFrames = Math.ceil(durationMs / FRAME_DURATION_MS);

    console.log(`MP4 Duration: ${durationMs}ms, Frames: ${totalFrames} @ ${FPS}FPS`);

    // 4. Setup Muxer & Encoder
    const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
            codec: 'avc', // H.264
            width: exportWidth,
            height: exportHeight,
            frameRate: FPS
        },
        fastStart: 'in-memory', // Moves MOOV atom to front for better compatibility
    });

    const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => console.error("VideoEncoder error:", e)
    });

    videoEncoder.configure({
        codec: 'avc1.4d002a', // Main Profile Level 4.2 (Supports up to 1080p @ 60fps)
        width: exportWidth,
        height: exportHeight,
        bitrate: settings.bitrate,
        framerate: FPS
    });

    // 5. Render Loop
    if (onProgress) onProgress(30, "Encoding video...");

    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    // GPU-accelerated canvas (no willReadFrequently - deep fry panels are pre-calculated)
    const ctx = canvas.getContext('2d', { alpha: false });

    // Mobile Fix for black frames: Fill black initially
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    try {
        for (let i = 0; i < totalFrames; i++) {
            // Check if encoder died
            if (videoEncoder.state === 'closed') {
                throw new Error("VideoEncoder closed unexpectedly");
            }

            // Calculate precise time in MS for this frame (integer to avoid float accumulation)
            const currentTimeMs = Math.round(i * 1000 / FPS);
            const timestampMicroseconds = Math.round(i * 1_000_000 / FPS);

            // Render Frame
            await renderMemeFrame(ctx, meme, stickers, texts, i, assets, dimensions, {
                stickersOnly: false,
                totalFrames,
                exportDelayMs: FRAME_DURATION_MS,
                currentTimeMs: currentTimeMs
            });

            // Encode Frame
            let frame = null;
            try {
                frame = new VideoFrame(canvas, {
                    timestamp: timestampMicroseconds,
                    duration: Math.round(1_000_000 / FPS)
                });

                // Keyframe every 0.5 seconds (15 frames) - more frequent keyframes
                // prevent compression artifacts on sticker/text overlays
                const keyFrame = i % 15 === 0;

                videoEncoder.encode(frame, { keyFrame });
            } finally {
                if (frame) frame.close();
            }

            // Smart yielding: only yield when encoder queue is backed up or periodically
            // Avoids the 4ms setTimeout floor penalty on every frame (~3.6s waste for 900 frames)
            if (videoEncoder.encodeQueueSize > 10) {
                // Encoder is behind - yield to let it catch up
                await new Promise(r => setTimeout(r, 1));
            } else if (i % 10 === 0) {
                // Periodic yield every 10 frames to keep UI responsive
                await new Promise(r => setTimeout(r, 0));
            }

            // Batch progress updates (every 30 frames ≈ 1s of video)
            // Reduces 900 React toast re-renders to ~30
            if (onProgress && (i % 30 === 0 || i === totalFrames - 1)) {
                const pct = 30 + Math.round((i / totalFrames) * 60);
                onProgress(pct, `Encoding ${i + 1}/${totalFrames}`);
            }
        }
    } catch (e) {
        console.error("Encoding Loop Error:", e);
        throw e;
    }

    if (onProgress) onProgress(95, "Finalizing MP4...");

    // 6. Finish
    await videoEncoder.flush();
    muxer.finalize();

    const { buffer } = muxer.target;
    return new Blob([buffer], { type: 'video/mp4' });
}
