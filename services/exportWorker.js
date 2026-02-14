
import { renderMemeFrame, calculateDimensions, loadMemeAssets } from './renderService';
import GIF from 'gif.js';
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

async function startExport({ meme, texts, stickers, quality, format, videoProxyPort }) {
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
        await exportGif(meme, texts, stickers, assets, quality);
    } else if (format === 'mp4') {
        await exportMp4(meme, texts, stickers, assets, quality);
    }
}

async function exportGif(meme, texts, stickers, assets, quality) {
    // 1. Dimensions
    const dimensions = calculateDimensions(meme, assets);
    const { exportWidth, exportHeight } = dimensions;

    // 2. Setup GIF Encoder
    // Note: gif.js spawns its OWN workers.
    // If we run gif.js inside a worker, it spawns workers from a worker (nested workers).
    // Chrome supports this. Safari might be tricky but usually supports it now.
    // However, gif.js expects 'window' or 'document' to find the worker script path?
    // We need to pass workerScript to GIF constructor.

    const numWorkers = 4;
    const gif = new GIF({
        workers: numWorkers,
        quality: quality || 5,
        width: exportWidth,
        height: exportHeight,
        workerScript: '/gif.worker.js', // Ensure this path is correct relative to the hosted site
        dither: true
    });

    // 3. Frame Logic
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

    // 4. Render Loop (OffscreenCanvas)
    const canvas = new OffscreenCanvas(exportWidth, exportHeight);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    for (let i = 0; i < totalFrames; i++) {
        await renderMemeFrame(ctx, meme, stickers, texts, i, assets, dimensions, {
             stickersOnly: false,
             totalFrames,
             exportDelayMs: delay
        });

        // gif.js accepts ImageData or CanvasElement (which OffscreenCanvas is compatible with in some envs?)
        // Actually gif.js checks for Context2D or ImageData.
        // We can pass ctx which is OffscreenCanvasRenderingContext2D.
        // Need to verify if gif.js supports it.
        // If not, we pass ctx.getImageData(0,0,w,h). Safe fallback.
        const imageData = ctx.getImageData(0, 0, exportWidth, exportHeight);
        gif.addFrame(imageData, { copy: true, delay });

        const pct = 30 + Math.round((i / totalFrames) * 40);
        self.postMessage({ type: 'PROGRESS', payload: { progress: pct, message: `Rendering Frame ${i + 1}/${totalFrames}` } });

        // Yield to event loop to allow messages to flush
        await new Promise(r => setTimeout(r, 0));
    }

    self.postMessage({ type: 'PROGRESS', payload: { progress: 75, message: "Encoding GIF (Worker)..." } });

    // 5. Finalize
    gif.on('finished', (blob) => {
        self.postMessage({ type: 'DONE', payload: blob });
    });

    gif.on('progress', (p) => {
         const pct = 75 + Math.round(p * 24);
         self.postMessage({ type: 'PROGRESS', payload: { progress: pct, message: "Encoding pixels..." } });
    });

    try {
        gif.render();
    } catch (e) {
        throw e;
    }
}

async function exportMp4(meme, texts, stickers, assets, quality) {
    if (typeof VideoEncoder === 'undefined') {
        throw new Error("WebCodecs (VideoEncoder) not supported in Worker.");
    }

    // 1. Dimensions
    let dimensions = calculateDimensions(meme, assets);
    let { exportWidth, exportHeight } = dimensions;

    const QUALITY_SETTINGS = {
        high: { scale: 1.0, bitrate: 6_000_000, framerate: 60 },
        medium: { scale: 0.75, bitrate: 2_500_000, framerate: 60 },
        low: { scale: 0.5, bitrate: 1_000_000, framerate: 30 }
    };
    const settings = QUALITY_SETTINGS[quality] || QUALITY_SETTINGS.medium;

    exportWidth = Math.round(exportWidth * settings.scale);
    exportHeight = Math.round(exportHeight * settings.scale);

    // MP4 even-dim requirement
    if (exportWidth % 2 !== 0) exportWidth++;
    if (exportHeight % 2 !== 0) exportHeight++;

    dimensions = { ...dimensions, exportWidth, exportHeight };

    // 2. Duration
    // 2. Duration
    const FPS = settings.framerate;
    const FRAME_DURATION_MS = 1000 / FPS;
    const MAX_SHARING_DURATION_MS = 60000;
    let durationMs = 1000;

    // ... (Duration logic similar to main thread, reused) ...
    // Reuse specific logic or just copy for now to ensure isolation
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
    durationMs = Math.min(durationMs, MAX_SHARING_DURATION_MS);
    const totalFrames = Math.ceil(durationMs / FRAME_DURATION_MS);

    // 3. Encoder Setup
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
        codec: 'avc1.4d002a',
        width: exportWidth,
        height: exportHeight,
        bitrate: settings.bitrate,
        framerate: FPS
    });

    // 4. Render Loop
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

        // Convert OffscreenCanvas to VideoFrame
        // VideoFrame can take OffscreenCanvas directly
        let frame = new VideoFrame(canvas, {
             timestamp: timestampMicroseconds,
             duration: Math.round(1_000_000 / FPS)
        });

        const keyFrame = i % 15 === 0;
        videoEncoder.encode(frame, { keyFrame });
        frame.close();

        // Progress
        if (i % 15 === 0) {
            const pct = 30 + Math.round((i / totalFrames) * 60);
             self.postMessage({ type: 'PROGRESS', payload: { progress: pct, message: `Encoding video frame ${i}/${totalFrames}` } });
             await new Promise(r => setTimeout(r, 0)); // Yield
        }
    }

    await videoEncoder.flush();
    muxer.finalize();

    const { buffer } = muxer.target;
    // MP4 blob
    const blob = new Blob([buffer], { type: 'video/mp4' });
    self.postMessage({ type: 'DONE', payload: blob });
}
