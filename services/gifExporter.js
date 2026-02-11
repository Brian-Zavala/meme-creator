import GIF from 'gif.js';
import { calculateGifLoopDuration, hasAnimatedText } from '../constants/textAnimations';
import { loadMemeAssets, renderMemeFrame, calculateDimensions, applyDeepFry } from './renderService';


/**
 * Exports a meme as an animated GIF
 * Supports Multi-Panel, Per-Panel Filters, and Deep Fry
 */
export async function exportMemeAsGif(meme, texts, stickers, onProgress) {
    // 1. Load all assets (GIFs, Videos, Images)
    if (onProgress) onProgress(10, "Loading assets...");
    const assets = await loadMemeAssets(meme, stickers);

    // 1b. Optimize Deep Fry: Pre-calculate fried versions of STATIC images
    // This provides a HUGE speed boost (10x+) as we only deep fry once per image, instead of every frame
    assets.friedImages = {};

    for (const panel of meme.panels) {
       // Only process static images that requested deep fry
       if (assets.staticImages[panel.id] && (panel.filters?.deepFry || 0) > 0) {
           const imgSrc = assets.staticImages[panel.id];
           const canvas = document.createElement('canvas');
           canvas.width = imgSrc.width;
           canvas.height = imgSrc.height;
           const ctx = canvas.getContext('2d');
           ctx.drawImage(imgSrc, 0, 0);

           // Apply Deep Fry ONCE
           applyDeepFry(ctx, 0, 0, canvas.width, canvas.height, panel.filters.deepFry);

           // Store the fried version for the renderer to use directly
           assets.friedImages[panel.id] = canvas;
       }
    }


    if (onProgress) onProgress(20, "Analyzing dimensions...");

    // 2. Calculate Dimensions
    let dimensions = calculateDimensions(meme, assets);
    let { exportWidth, exportHeight } = dimensions; // Get dimensions that include padding

    // QUALITY/SPEED BALANCE:
    // GIFs are huge. We cap max dimension to 1080px (formerly 600px) to ensure text readability.
    // 1080px is now standard for high quality social sharing.
    const MAX_GIF_DIMENSION = 1080;
    if (exportWidth > MAX_GIF_DIMENSION || exportHeight > MAX_GIF_DIMENSION) {
        const scale = MAX_GIF_DIMENSION / Math.max(exportWidth, exportHeight);
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
        console.log(`Scaled GIF export dimensions to ${exportWidth}x${exportHeight}`);
    }


    // 3. Setup GIF Encoder
    const gif = new GIF({
        workers: 4, // Max workers for speed (check browser limits)
        quality: 1, // 1 is best quality (slower), 10 is default. We want crisp text.
        width: exportWidth,
        height: exportHeight,
        workerScript: '/gif.worker.js', // Ensure this file exists in /public
        dither: true // Better colors
    });

    if (onProgress) onProgress(30, "Rendering frames...");

    // 4. Frame Logic & TIMING
    const { gifProcessors, staticImages } = assets;

    // STEP 1: Determine Optimal Frame Delay (Framerate)
    // We want to match the source GIF speeds if possible, but cap at ~20-30FPS for smoothness.
    // Default to 50ms (20FPS) which is much smoother than 100ms (10FPS)
    // We scan all animated assets to find their native delays.
    let minDelay = 100;
    let hasAnimatedAssets = false;

    const allProcessors = [
        ...Object.values(gifProcessors),
        ...Object.values(assets.stickerProcessors)
    ];

    if (allProcessors.length > 0) {
        hasAnimatedAssets = true;
        // Find minimum delay across all assets to capture fast movement
        allProcessors.forEach(p => {
             if (p.getDelay) {
                 // GIF reader returns delay in 1/100s. We want ms.
                 // Some GIFs report 0 delay, which usually means 100ms default.
                 let d = p.getDelay(0) * 10;
                 if (d < 20) d = 100; // Sanity check for bad headers
                 if (d > 0) minDelay = Math.min(minDelay, d);
             }
        });
        // CLAMP: Don't go faster than 33ms (30FPS) to keep generation time reasonable
        // 20ms (50FPS) is overkill for memes and bloats file size.
        minDelay = Math.max(30, minDelay);
    } else if (hasAnimatedText(texts) || (stickers || []).some(s => s.animation && s.animation !== 'none')) {
        // Text-only animation: Use 50ms (20FPS) for smooth text effects (Wave, etc)
        minDelay = 50;
    } else {
        // Static image (shouldn't really be here for GIF export, but fallback)
        minDelay = 100;
    }

    // Align delay to nearest 10ms for GIF spec compliance
    const delay = Math.round(minDelay / 10) * 10;


    // STEP 2: Calculate Total Loop Duration
    // We want a seamless loop. Ideally LCM of durations, but capped.
    // We gather the duration of all animated elements.
    let maxDuration = 3000; // Default 3s

    if (hasAnimatedAssets) {
        // Find longest asset duration
        // We might want LCM, but for mixed content, simply covering the longest video/GIF often works best
        // combined with a hard cap.
        allProcessors.forEach(p => {
            let duration = 0;
            if (p.getDuration) {
                duration = p.getDuration();
            } else if (p.numFrames && p.getAllDelays) {
                 duration = p.getAllDelays().reduce((a, b) => a + b, 0) * 10;
            } else if (p.numFrames) {
                 duration = p.numFrames * 100; // fallback guess
            }

            if (duration > 0) maxDuration = Math.max(maxDuration, duration);
        });
    }

    if (hasAnimatedText(texts) || (stickers || []).some(s => s.animation && s.animation !== 'none')) {
         const textDuration = calculateGifLoopDuration(texts, stickers);
         maxDuration = Math.max(maxDuration, textDuration);
    }

    // Hard Cap at 6 seconds (was 5s / 50frames).
    // With 30-50ms delay, frame count can get high.
    // 6000ms / 40ms = 150 frames. acceptable.
    const MAX_DURATION_MS = 6000;
    const finalDuration = Math.min(maxDuration, MAX_DURATION_MS);

    // STEP 3: Calculate Final Frame Count
    const totalFrames = Math.ceil(finalDuration / delay);

    console.log(`Exporting GIF: ${totalFrames} frames @ ${delay}ms delay (${Math.round(1000/delay)} FPS). Duration: ${finalDuration}ms`);


    // 5. Render Loop
    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    for (let i = 0; i < totalFrames; i++) {
        // Render FRAME i
        await renderMemeFrame(ctx, meme, stickers, texts, i, assets, dimensions, {
             stickersOnly: false,
             totalFrames,
             exportDelayMs: delay
        });

        // Add to GIF
        gif.addFrame(ctx, { copy: true, delay }); // standard 100ms delay

        // Progress Update
        if (onProgress) {
            const pct = 30 + Math.round((i / totalFrames) * 40); // 30% -> 70%
            onProgress(pct, `Rendering Frame ${i + 1}/${totalFrames}`);
        }

        // Yield to main thread briefly so UI doesn't freeze
        await new Promise(r => setTimeout(r, 0));
    }

    if (onProgress) onProgress(75, "Encoding GIF...");

    // 6. Finalize
    return new Promise((resolve, reject) => {
        gif.on('finished', (blob) => {
            if (onProgress) onProgress(100, "Done!");
            resolve(blob);
        });

        // Progress from the worker
        gif.on('progress', (p) => {
             if (onProgress) {
                // Map p (0-1) to 75-99%
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
