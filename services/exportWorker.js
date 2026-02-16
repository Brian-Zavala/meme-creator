
import { renderMemeFrame, calculateDimensions, loadMemeAssets } from './renderService';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { calculateGifLoopDuration, hasAnimatedText } from '../constants/textAnimations';

/*
   Worker Message Protocol:
   IN: { type: 'START_EXPORT', payload: { exportId, meme, texts, stickers, quality, format } }
   OUT: { type: 'PROGRESS', payload: { progress, message } }
   OUT: { type: 'DONE', payload: { blob } }
   OUT: { type: 'ERROR', payload: { error } }
*/

self.onmessage = async function (e) {
    const { type, payload } = e.data;

    if (type === 'START_EXPORT') {
        try {
            await startExport(payload);
        } catch (err) {
            console.error("Worker Export Error:", err);
            self.postMessage({ type: 'ERROR', payload: err.message });
        }
    }
};

async function startExport({ meme, texts, stickers, quality, format, action, videoProxyPort }) {
    // 1. Load Assets
    self.postMessage({ type: 'PROGRESS', payload: { progress: 10, message: "Loading assets (Worker)..." } });

    // Inject pre-loaded video frames from Main Thread if any
    // Logic: Main thread decodes video frames to ImageBitmaps and passes them via transferables??
    // OR we just use loadMemeAssets which now supports ImageBitmap fetching in worker.

    // Note: 'meme' object might contain Blob objects for 'sourceBlob'.
    // Ensure they are correctly handled.

    // Clean up meme object?
    // JSON serialization strips functions, but Blobs are preserved in structuredClone (postMessage).

    const assets = await loadMemeAssets(meme, stickers, videoProxyPort);

    if (format === 'gif') {
        await exportGif(meme, texts, stickers, assets, quality, action);
    } else if (format === 'mp4') {
        await exportMp4(meme, texts, stickers, assets, quality, action);
    }
}

async function exportGif(meme, texts, stickers, assets, quality, action) {
    // --- 1. Tier Config ---
    const isShare = action === 'share';
    const MAX_GIF_DIMENSION = isShare ? 480 : 800;
    const LOSSY_LEVEL = isShare ? 60 : 30;
    const GIFSICLE_COLORS = isShare ? '--colors 128' : '--colors 256';

    // --- 2. Dimensions ---
    let dimensions = calculateDimensions(meme, assets);
    let { exportWidth, exportHeight } = dimensions;

    if (exportWidth > MAX_GIF_DIMENSION || exportHeight > MAX_GIF_DIMENSION) {
        const scale = MAX_GIF_DIMENSION / Math.max(exportWidth, exportHeight);
        exportWidth = Math.round(exportWidth * scale);
        exportHeight = Math.round(exportHeight * scale);

        dimensions = {
            ...dimensions,
            exportWidth,
            exportHeight,
            contentHeight: Math.round(dimensions.contentHeight * scale),
            contentOffsetY: Math.round(dimensions.contentOffsetY * scale),
            contentOffsetBottom: Math.round(dimensions.contentOffsetBottom * scale)
        };
        console.log(`[Worker] Clamped GIF dimensions to ${exportWidth}x${exportHeight} (${isShare ? 'share' : 'download'} tier)`);
    }

    // --- 3. Frame Timing ---
    const { gifProcessors } = assets;
    let minDelay = 100;
    let hasAnimatedAssets = false;

    const allProcessors = [
        ...Object.values(gifProcessors),
        ...Object.values(assets.stickerProcessors)
    ];

    if (allProcessors.length > 0) {
        hasAnimatedAssets = true;
        allProcessors.forEach(p => {
            if (p.getDelay) {
                let d = p.getDelay(0) * 10;
                if (d < 20) d = 100;
                if (d > 0) minDelay = Math.min(minDelay, d);
            }
        });
        minDelay = Math.max(50, minDelay);
    } else if (hasAnimatedText(texts) || (stickers || []).some(s => s.animation && s.animation !== 'none')) {
        minDelay = 80;
    } else {
        minDelay = 100;
    }

    const delay = Math.round(minDelay / 10) * 10;

    // Duration
    let maxDuration = 3000;
    if (hasAnimatedAssets) {
        allProcessors.forEach(p => {
            let duration = 0;
            if (p.getDuration) duration = p.getDuration();
            else if (p.numFrames) duration = p.numFrames * 100;
            if (duration > 0) maxDuration = Math.max(maxDuration, duration);
        });
    }

    if (hasAnimatedText(texts) || (stickers || []).some(s => s.animation && s.animation !== 'none')) {
        const textDuration = calculateGifLoopDuration(texts, stickers);
        maxDuration = Math.max(maxDuration, textDuration);
    }

    const MAX_DURATION_MS = 5000;
    const finalDuration = Math.min(maxDuration, MAX_DURATION_MS);
    const totalFrames = Math.ceil(finalDuration / delay);

    // --- 4. gifenc Encoder Setup ---
    const gif = GIFEncoder();

    // --- 5. Render Loop (OffscreenCanvas) ---
    const canvas = new OffscreenCanvas(exportWidth, exportHeight);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    for (let i = 0; i < totalFrames; i++) {
        await renderMemeFrame(ctx, meme, stickers, texts, i, assets, dimensions, {
            stickersOnly: false,
            totalFrames,
            exportDelayMs: delay
        });

        const imageData = ctx.getImageData(0, 0, exportWidth, exportHeight);
        const { data } = imageData;

        // Quantize RGBA pixels to 256-color palette, then map to indices
        const palette = quantize(data, 256, { format: 'rgb565' });
        const index = applyPalette(data, palette, 'rgb565');

        gif.writeFrame(index, exportWidth, exportHeight, {
            palette,
            delay,
            repeat: 0,
        });

        const pct = 30 + Math.round((i / totalFrames) * 40);
        self.postMessage({ type: 'PROGRESS', payload: { progress: pct, message: `Rendering Frame ${i + 1}/${totalFrames}` } });

        // Yield to event loop
        await new Promise(r => setTimeout(r, 0));
    }

    // --- 6. Finalize gifenc ---
    gif.finish();
    const rawBytes = gif.bytes();
    const rawSizeMB = (rawBytes.byteLength / (1024 * 1024)).toFixed(2);
    console.log(`[Worker] Raw GIF size: ${rawSizeMB}MB`);

    self.postMessage({ type: 'PROGRESS', payload: { progress: 72, message: "Optimizing GIF..." } });

    // --- 7. gifsicle Post-Processing ---
    // Polyfill Element for worker context — gifsicle-wasm-browser's testType()
    // does `input instanceof Element` which throws ReferenceError in workers
    if (typeof Element === 'undefined') self.Element = class Element {};

    let finalBlob;
    try {
        const gifsicle = (await import('gifsicle-wasm-browser')).default;

        const command = `-O2 --lossy=${LOSSY_LEVEL} ${GIFSICLE_COLORS} input.gif -o /out/optimized.gif`;

        const results = await gifsicle.run({
            input: [{ file: new Blob([rawBytes], { type: 'image/gif' }), name: 'input.gif' }],
            command: [command]
        });

        if (results && results.length > 0) {
            finalBlob = results[0];
            const optimizedSizeMB = (finalBlob.size / (1024 * 1024)).toFixed(2);
            console.log(`[Worker] Optimized GIF size: ${optimizedSizeMB}MB (was ${rawSizeMB}MB)`);
        } else {
            console.warn('[Worker] gifsicle returned no output, using raw GIF');
            finalBlob = new Blob([rawBytes], { type: 'image/gif' });
        }
    } catch (err) {
        console.warn('[Worker] gifsicle optimization failed, using raw GIF:', err.message);
        finalBlob = new Blob([rawBytes], { type: 'image/gif' });
    }

    self.postMessage({ type: 'PROGRESS', payload: { progress: 98, message: "Done!" } });
    self.postMessage({ type: 'DONE', payload: finalBlob });
}

async function exportMp4(meme, texts, stickers, assets, quality, action) {
    if (typeof VideoEncoder === 'undefined') {
        throw new Error("WebCodecs (VideoEncoder) not supported in Worker.");
    }

    const isShare = action === 'share';

    // --- 1. Tier Config ---
    // Share tier: small, fast, universally compatible (iMessage, Discord, WhatsApp)
    // Download tier: high quality, user controls playback device
    const TIER = isShare
        ? { maxDimension: 480, fps: 24, bitrate: 800_000, codec: 'avc1.42001e', keyframeInterval: 24, maxDurationMs: 15_000 }
        : { maxDimension: 1080, fps: 30, bitrate: 4_000_000, codec: 'avc1.4d002a', keyframeInterval: 30, maxDurationMs: 60_000 };

    // Download tier still respects quality picker for additional scaling
    const QUALITY_SCALE = isShare ? 1.0 : ({ high: 1.0, medium: 0.85, low: 0.65 }[quality] || 0.85);

    console.log(`[Worker] MP4 tier: ${isShare ? 'share' : 'download'}, quality: ${quality}, codec: ${TIER.codec}`);

    // --- 2. Dimensions ---
    let dimensions = calculateDimensions(meme, assets);
    const origWidth = dimensions.exportWidth;
    const origHeight = dimensions.exportHeight;
    let { exportWidth, exportHeight } = dimensions;

    // Apply quality scaling (download only — share is always 1.0)
    exportWidth = Math.round(exportWidth * QUALITY_SCALE);
    exportHeight = Math.round(exportHeight * QUALITY_SCALE);

    // Clamp to tier max dimension
    if (exportWidth > TIER.maxDimension || exportHeight > TIER.maxDimension) {
        const scale = TIER.maxDimension / Math.max(exportWidth, exportHeight);
        exportWidth = Math.round(exportWidth * scale);
        exportHeight = Math.round(exportHeight * scale);
        console.log(`[Worker] Clamped MP4 dimensions to ${exportWidth}x${exportHeight} (${isShare ? 'share' : 'download'} tier)`);
    }

    // MP4 even-dim requirement
    if (exportWidth % 2 !== 0) exportWidth++;
    if (exportHeight % 2 !== 0) exportHeight++;

    // Scale ALL dimension components proportionally (not just exportWidth/exportHeight)
    // Without this, panel positions are calculated for the original canvas size but drawn
    // on a smaller scaled canvas, causing cropping and incorrect positioning.
    const scaleX = exportWidth / origWidth;
    const scaleY = exportHeight / origHeight;
    dimensions = {
        ...dimensions,
        exportWidth,
        exportHeight,
        contentHeight: Math.round(dimensions.contentHeight * scaleY),
        contentOffsetY: Math.round(dimensions.contentOffsetY * scaleY),
        contentOffsetBottom: Math.round(dimensions.contentOffsetBottom * scaleY),
    };

    // --- 3. Duration ---
    const FPS = TIER.fps;
    const FRAME_DURATION_MS = 1000 / FPS;
    let durationMs = 1000;

    if (hasAnimatedText(texts) || (stickers || []).some(s => s.animation && s.animation !== 'none')) {
        const animDuration = calculateGifLoopDuration(texts, stickers);
        durationMs = Math.max(durationMs, animDuration);
    }
    Object.values(assets.gifProcessors).forEach(p => {
        if (p.getDuration) {
             const d = p.getDuration();
             if (d > 0) durationMs = Math.max(durationMs, d);
        }
    });
    durationMs = Math.min(durationMs, TIER.maxDurationMs);
    const totalFrames = Math.ceil(durationMs / FRAME_DURATION_MS);

    console.log(`[Worker] MP4 export: ${exportWidth}x${exportHeight} @ ${FPS}fps, ${totalFrames} frames, ${Math.round(TIER.bitrate / 1000)}kbps, duration ${durationMs}ms`);

    // --- 4. Encoder Setup ---
    const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
            codec: 'avc',
            width: exportWidth,
            height: exportHeight,
            frameRate: FPS
        },
        fastStart: 'in-memory',
    });

    const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => console.error("Worker VideoEncoder error:", e)
    });

    videoEncoder.configure({
        codec: TIER.codec,
        width: exportWidth,
        height: exportHeight,
        bitrate: TIER.bitrate,
        framerate: FPS
    });

    // --- 5. Render Loop ---
    const canvas = new OffscreenCanvas(exportWidth, exportHeight);
    const ctx = canvas.getContext('2d', { alpha: false }); // MP4 no alpha
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    for (let i = 0; i < totalFrames; i++) {
        const currentTimeMs = Math.round(i * 1000 / FPS);
        const timestampMicroseconds = Math.round(i * 1_000_000 / FPS);

        await renderMemeFrame(ctx, meme, stickers, texts, i, assets, dimensions, {
            stickersOnly: false,
            totalFrames,
            exportDelayMs: FRAME_DURATION_MS,
            currentTimeMs: currentTimeMs
        });

        let frame = new VideoFrame(canvas, {
             timestamp: timestampMicroseconds,
             duration: Math.round(1_000_000 / FPS)
        });

        const keyFrame = i % TIER.keyframeInterval === 0;
        videoEncoder.encode(frame, { keyFrame });
        frame.close();

        // Progress
        if (i % TIER.keyframeInterval === 0) {
            const pct = 30 + Math.round((i / totalFrames) * 60);
             self.postMessage({ type: 'PROGRESS', payload: { progress: pct, message: `Encoding video frame ${i}/${totalFrames}` } });
             await new Promise(r => setTimeout(r, 0)); // Yield
        }
    }

    await videoEncoder.flush();
    muxer.finalize();

    const { buffer } = muxer.target;
    const blob = new Blob([buffer], { type: 'video/mp4' });
    self.postMessage({ type: 'DONE', payload: blob });
}
