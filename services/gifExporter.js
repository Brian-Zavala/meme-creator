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

export async function exportMemeAsGif(meme, texts, stickers, onProgress, quality = 5) {
    const exportId = crypto.randomUUID();
    let wakeLock = null;
    let tickWorker = null;

    try {
        if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
        tickWorker = createTickWorker();

        // 1. Calculate Dimensions


        // 2. Load Assets
        const assets = await loadMemeAssets(meme, texts, stickers);

        // 1. Calculate Dimensions (Fixed: Pass meme and assets, not panels/scale)
        const dimensions = calculateDimensions(meme, assets);
        const { exportWidth, exportHeight } = dimensions;

        // 3. Setup GIF Encoder
        const gif = new GIF({
            workers: 4,
            quality: quality,
            width: exportWidth,
            height: exportHeight,
            workerScript: '/gif.worker.js',
            dither: true
        });

        if (onProgress) onProgress(30, "Rendering frames...");

        // 4. Frame Logic & TIMING
        const { gifProcessors, staticImages } = assets;

        // STEP 1: Determine Optimal Frame Delay
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

        // STEP 2: Calculate Total Loop Duration
        let maxDuration = 3000;

        if (hasAnimatedAssets) {
            allProcessors.forEach(p => {
                let duration = 0;
                if (p.getDuration) {
                    duration = p.getDuration();
                } else if (p.numFrames && p.getAllDelays) {
                     duration = p.getAllDelays().reduce((a, b) => a + b, 0) * 10;
                } else if (p.numFrames) {
                     duration = p.numFrames * 100;
                }
                if (duration > 0) maxDuration = Math.max(maxDuration, duration);
            });
        }

        if (hasAnimatedText(texts) || (stickers || []).some(s => s.animation && s.animation !== 'none')) {
             const textDuration = calculateGifLoopDuration(texts, stickers);
             maxDuration = Math.max(maxDuration, textDuration);
        }

        const MAX_DURATION_MS = 5000;
        const finalDuration = Math.min(maxDuration, MAX_DURATION_MS);

        // STEP 3: Calculate Final Frame Count
        const totalFrames = Math.ceil(finalDuration / delay);

        console.log(`Exporting GIF: ${totalFrames} frames @ ${delay}ms delay (${Math.round(1000/delay)} FPS). Duration: ${finalDuration}ms`);

        // 5. Render Loop with TICK WORKER protection
        const canvas = document.createElement('canvas');
        canvas.width = exportWidth;
        canvas.height = exportHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Start Tick Worker
        tickWorker = createTickWorker();

        for (let i = 0; i < totalFrames; i++) {
            await renderMemeFrame(ctx, meme, stickers, texts, i, assets, dimensions, {
                 stickersOnly: false,
                 totalFrames,
                 exportDelayMs: delay
            });

            gif.addFrame(ctx, { copy: true, delay });

            if (onProgress) {
                const pct = 30 + Math.round((i / totalFrames) * 40);
                onProgress(pct, `Rendering Frame ${i + 1}/${totalFrames}`);

                // Update DB progress occasionally (every 5 frames or so)
                if (i % 5 === 0) {
                     db.activeExports.update(exportId, { progress: pct, status: 'rendering' }).catch(() => {});
                }
            }

            // Yield using Tick Worker to bypass background throttling
            await new Promise(resolve => {
                const handler = () => {
                    tickWorker.removeEventListener('message', handler);
                    resolve();
                };
                tickWorker.addEventListener('message', handler);
                tickWorker.postMessage('tick');
            });
        }

        // Terminate worker when loop done
        if (tickWorker) tickWorker.terminate();

        if (onProgress) onProgress(75, "Encoding GIF...");
        await db.activeExports.update(exportId, { progress: 75, status: 'encoding' });

        // 6. Finalize
        return new Promise((resolve, reject) => {
            gif.on('finished', async (blob) => {
                if (onProgress) onProgress(100, "Done!");

                // CLEANUP: Remove from active exports
                await db.activeExports.delete(exportId);
                if (wakeLock) await wakeLock.release().catch(() => {});

                resolve(blob);
            });

            gif.on('progress', (p) => {
                 if (onProgress) {
                    const pct = 75 + Math.round(p * 24);
                    onProgress(pct, "Encoding pixels...");
                 }
            });

            try {
                gif.render();
            } catch (e) {
                reject(e);
            }
        });

    } catch (err) {
        // ERROR HANDLING
        console.error("Export Failed:", err);
        // Mark as failed in DB so recovery manager knows (or just delete?)
        // Deleting is safer to avoid recover-loops for broken memes.
        await db.activeExports.delete(exportId).catch(() => {});

        if (wakeLock) await wakeLock.release().catch(() => {});
        if (tickWorker) tickWorker.terminate();

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
