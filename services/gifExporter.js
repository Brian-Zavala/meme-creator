import GIF from 'gif.js';
import { calculateGifLoopDuration, hasAnimatedText } from '../constants/textAnimations';
import { loadMemeAssets, renderMemeFrame, calculateDimensions, applyDeepFry } from './renderService';


/**
 * Exports a meme as an animated GIF
 * Supports Multi-Panel, Per-Panel Filters, and Deep Fry
 */
/**
 * Exports a meme as an animated GIF
 * Supports Multi-Panel, Per-Panel Filters, Deep Fry, and Background Persistence
 */
import { db } from './db';

// Helper: Create a "Tick Worker" to bypass background tab throttling
// Browsers throttle setTimeout/setInterval to 1s in background tabs.
// Web Workers run in a separate thread and are NOT throttled (mostly).
function createTickWorker() {
    const blob = new Blob([`
        self.onmessage = function(e) {
            if (e.data === 'tick') {
                // Determine next tick (immediate or slight delay?)
                // Just posting back immediately is fine for "setTimeout(0)" behavior
                self.postMessage('tock');
            }
        };
    `], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
}

import { VideoFrameProvider } from './VideoFrameProvider';

export async function exportMemeAsGif(meme, texts, stickers, onProgress, quality = 5, action = 'download') {
    const exportId = crypto.randomUUID();
    let wakeLock = null;
    let videoProvider = null;

    try {
        if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');

        // Setup Video Proxy
        videoProvider = new VideoFrameProvider();
        await videoProvider.init(meme);
        const { port1, port2 } = new MessageChannel();
        port1.onmessage = (e) => videoProvider.handleMessage(e, port1);

        // WORKER IMPLEMENTATION
        return new Promise((resolve, reject) => {
            const worker = new Worker(new URL('./exportWorker.js', import.meta.url), { type: 'module' });

            // Clean up helper
            const terminate = () => {
                worker.terminate();
                if (wakeLock) wakeLock.release().catch(() => {});
                db.activeExports.delete(exportId).catch(() => {});
                port1.close();
                videoProvider.cleanup();
            };

            worker.onmessage = (e) => {
                const { type, payload } = e.data;

                if (type === 'PROGRESS') {
                    if (onProgress) onProgress(payload.progress, payload.message);
                    if (payload.progress % 10 === 0) {
                         db.activeExports.update(exportId, { progress: payload.progress, status: 'rendering' }).catch(() => {});
                    }
                } else if (type === 'DONE') {
                    terminate();
                    resolve(payload); // Blob
                } else if (type === 'ERROR') {
                    terminate();
                    reject(new Error(payload));
                }
            };

            worker.onerror = (err) => {
                 console.error("Worker Error Event:", err);
                 terminate();
                 reject(err);
            };

            // Start Export
            worker.postMessage({
                type: 'START_EXPORT',
                payload: {
                    exportId,
                    meme: structuredClone(meme),
                    texts: structuredClone(texts),
                    stickers: structuredClone(stickers),
                    quality,
                    action,
                    format: 'gif',
                    videoProxyPort: port2
                }
            }, [port2]); // Transfer port2

            // Initial DB record
            db.activeExports.add({
                id: exportId,
                type: 'gif',
                status: 'starting',
                progress: 0,
                data: {
                    meme: structuredClone(meme),
                    texts: structuredClone(texts),
                    stickers: structuredClone(stickers),
                    quality,
                    action
                }
            }).catch(() => {});
        });

    } catch (err) {
        console.error("Export Failed:", err);
        if (wakeLock) await wakeLock.release().catch(() => {});
        if (videoProvider) videoProvider.cleanup();
        throw err;
    }
}


/**
 * Export Stickers (or any static state) as PNG with Transparency
 */
export async function exportStickersAsPng(meme, stickers) {
    const exportMeme = { ...meme, stickersOnly: true };

    // 1. Load Assets
    const assets = await loadMemeAssets(exportMeme, stickers);

    // 2. Dimensions
    const dimensions = calculateDimensions(exportMeme, assets);
    const { exportWidth, exportHeight } = dimensions;

    // 3. Render Frame 0
    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d');

    // QUALITY FIX: Enable high-quality image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Render the frame (await since renderMemeFrame is async)
    await renderMemeFrame(ctx, exportMeme, stickers, meme.texts, 0, assets, dimensions, { stickersOnly: true });

    // 4. Export as Blob
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/png');
    });
}

/**
 * NEW: Export Full Meme as PNG (Standard "Download Image")
 * Replaces html2canvas to ensure standard filters & deep fry interactions work 1:1 with GIF logic
 */
export async function exportImageAsPng(meme, texts, stickers) {
    // 1. Load Assets
    const assets = await loadMemeAssets(meme, stickers);

    // 1b. Cache Deep Fry if needed (reuse existing optimization logic inside exportGif or just renderFrame)
    // Actually, renderMemeFrame will call applyDeepFry per-frame. For a single frame export, caching isn't strictly necessary for speed,
    // but consistency is key. We can just run renderMemeFrame once.
    // However, we should manually populate friedImages if we want to use the EXACT same path,
    // but simpler: renderMemeFrame handles on-the-fly deep fry if cache is missing.
    // So we just call renderMemeFrame.

    // 2. Dimensions
    let dimensions = calculateDimensions(meme, assets);
    let { exportWidth, exportHeight } = dimensions;

    // QUALITY FIX: Enforce MINIMUM resolution for crisp text rendering
    // Small source images (e.g. 400x300) cause blurry text when exported at native size
    // 1200px minimum ensures text is rendered at high quality regardless of source image size
    const MIN_STATIC_DIMENSION = 1200;
    if (exportWidth < MIN_STATIC_DIMENSION && exportHeight < MIN_STATIC_DIMENSION) {
        const scale = MIN_STATIC_DIMENSION / Math.max(exportWidth, exportHeight);
        exportWidth = Math.round(exportWidth * scale);
        exportHeight = Math.round(exportHeight * scale);

        // Update dimensions object for renderMemeFrame
        dimensions = {
            ...dimensions,
            exportWidth,
            exportHeight,
            contentHeight: Math.round(dimensions.contentHeight * scale),
            contentOffsetY: Math.round(dimensions.contentOffsetY * scale),
            contentOffsetBottom: Math.round(dimensions.contentOffsetBottom * scale)
        };
        console.log(`Upscaled Static Export dimensions to ${exportWidth}x${exportHeight} for crisp text quality`);
    }

    // MOBILE FIX: Clamp MAX dimension for static exports to prevent OOM on iOS/Android
    // 12MP photos (4000x3000) can crash mobile canvas. 2400px is safe & high quality (better than 1080p).
    const MAX_STATIC_DIMENSION = 2400;
    if (exportWidth > MAX_STATIC_DIMENSION || exportHeight > MAX_STATIC_DIMENSION) {
        const scale = MAX_STATIC_DIMENSION / Math.max(exportWidth, exportHeight);
        exportWidth = Math.round(exportWidth * scale);
        exportHeight = Math.round(exportHeight * scale);

        // Update dimensions object for renderMemeFrame
        dimensions = {
            ...dimensions,
            exportWidth,
            exportHeight,
            contentHeight: Math.round(dimensions.contentHeight * scale),
            contentOffsetY: Math.round(dimensions.contentOffsetY * scale),
            contentOffsetBottom: Math.round(dimensions.contentOffsetBottom * scale)
        };
        console.log(`Clamped Static Export dimensions to ${exportWidth}x${exportHeight} for mobile stability`);
    }

    // 3. Render Frame 0
    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d');

    // QUALITY FIX: Enable high-quality image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    await renderMemeFrame(ctx, meme, stickers, texts, 0, assets, dimensions, { stickersOnly: false });

    // 4. Export as Blob
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/png');
    });
}
