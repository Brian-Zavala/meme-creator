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
export async function exportMemeAsMp4(meme, texts, stickers, onProgress) {
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

    // MP4 specific: Dimensions must be even for H.264
    if (exportWidth % 2 !== 0) exportWidth++;
    if (exportHeight % 2 !== 0) exportHeight++;

    // Update dimensions object for renderMemeFrame
    dimensions = {
        ...dimensions,
        exportWidth,
        exportHeight
    };

    console.log(`Exporting MP4: ${exportWidth}x${exportHeight}`);

    // 3. Determine Duration and FPS
    // For MP4, we want a smoother 30FPS vs GIF's 10FPS
    const FPS = 30;
    const FRAME_DURATION_MS = 1000 / FPS;
    const MAX_SHARING_DURATION_MS = 15000; // 15s max for good sharing size
    const MIN_DURATION_MS = 3000; // Minimum 3s for short loops

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
        bitrate: 4_000_000, // 4 Mbps - High quality for HD video
        framerate: FPS
    });

    // 5. Render Loop
    if (onProgress) onProgress(30, "Encoding video...");

    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d', {
        willReadFrequently: true,
        alpha: false
    });

    // Mobile Fix for black frames: Fill black initially
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    try {
        for (let i = 0; i < totalFrames; i++) {
            // Check if encoder died
            if (videoEncoder.state === 'closed') {
                throw new Error("VideoEncoder closed unexpectedly");
            }

            // Calculate precise time in MS for this frame
            const currentTimeMs = i * FRAME_DURATION_MS;
            const timestampMicroseconds = i * (1_000_000 / FPS);

            // Render Frame
            await renderMemeFrame(ctx, meme, stickers, texts, i, assets, dimensions, {
                stickersOnly: false,
                totalFrames,
                exportDelayMs: FRAME_DURATION_MS, // Not strictly used if currentTimeMs is passed, but good for fallback
                currentTimeMs: currentTimeMs
            });

            // Encode Frame
            // We must draw to a VideoFrame.
            let frame = null;
            try {
                frame = new VideoFrame(canvas, {
                    timestamp: timestampMicroseconds,
                    duration: 1_000_000 / FPS
                });

                // Keyframe every 2 seconds (2 * 30 = 60 frames)
                const keyFrame = i % 60 === 0;

                videoEncoder.encode(frame, { keyFrame });
            } finally {
                if (frame) frame.close();
            }

            // Progress Update
            if (onProgress) {
                const pct = 30 + Math.round((i / totalFrames) * 60); // 30% -> 90%
                onProgress(pct, `Encoding Frame ${i + 1}/${totalFrames}`);
            }

            // Yield to prevent UI freeze
            await new Promise(r => setTimeout(r, 0));
        }
    } catch (e) {
        console.error("Encoding Loop Error:", e);
        throw e; // Re-throw to be caught by caller
    }

    if (onProgress) onProgress(95, "Finalizing MP4...");

    // 6. Finish
    await videoEncoder.flush();
    muxer.finalize();

    const { buffer } = muxer.target;
    return new Blob([buffer], { type: 'video/mp4' });
}
