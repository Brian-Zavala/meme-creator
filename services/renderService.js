
import GIF from 'gif.js';
import { GifReader } from 'omggif';
import { getAnimationById, hasAnimatedText, calculateGifLoopDuration } from '../constants/textAnimations';

/* =========================================================================================
   ASSET LOADING AND PROCESSING
   ========================================================================================= */

export async function createGifProcessor(url) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const reader = new GifReader(uint8Array);

        const width = reader.width;
        const height = reader.height;
            const numFrames = reader.numFrames();

        // Pre-calculate frame timing for accurate playback
        const frameDelays = [];
        let totalDuration = 0;
        const cumulativeDelays = [0]; // Start at 0

        for(let i=0; i<numFrames; i++) {
            const info = reader.frameInfo(i);
            const delay = (info.delay || 10) * 10; // Convert to ms (default 100ms if 0)
            frameDelays.push(delay);
            totalDuration += delay;
            cumulativeDelays.push(totalDuration); // cumulativeDelays[i+1] is end time of frame i
        }

        // Canvas to hold the CURRENT state of the GIF (accumulated frames)
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Helper for decoding
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        const rawFrameData = new Uint8ClampedArray(width * height * 4);

        let previousInfo = null;
        let savedState = null; // For disposal = 3
        let currentFrameIndex = -1;

        return {
            width,
            height,
            numFrames,
            // Returns total duration of the GIF in ms
            getDuration: () => totalDuration,

            // Returns the correct frame index for a specific time (ms) in the loop
            getFrameAtTime: (timeMs) => {
                if (numFrames <= 1) return 0;
                // Handle looping
                const t = timeMs % totalDuration;

                // Find frame where accum[i] <= t < accum[i+1]
                // accum array has numFrames + 1 entries
                // We want to find the first index where cumulativeDelays[index] > t
                // Then the frame index is index - 1
                const idx = cumulativeDelays.findIndex(d => d > t);

                // If not found (shouldn't happen if logic is correct, but safe fallback), return last frame
                return idx === -1 ? numFrames - 1 : Math.max(0, idx - 1);
            },

            // getDelay returns delay in centiseconds (1/100s) - GIF format standard
            getDelay: (frameIndex = 0) => reader.frameInfo(Math.min(frameIndex, numFrames - 1)).delay,
            // Get all frame delays for accurate timing export
            getAllDelays: () => {
                const delays = [];
                for (let i = 0; i < numFrames; i++) {
                    delays.push(reader.frameInfo(i).delay);
                }
                return delays;
            },
            // Renders the specific frame index to the internal canvas and returns it
            renderFrame: (frameIndex) => {
                // If we are asking for the next frame sequentially, great.
                // If we skipped or looped, we might need to reset or seek.
                // For simple looping (0 -> 1 -> ... -> N -> 0), we handle the wrap properly.

                if (frameIndex === 0 && currentFrameIndex !== -1) {
                    // Reset state for loop
                    // MOBILE FIX: Use fillRect with transparent before clear to ensure
                    // canvas is in a known state on all platforms (iOS Safari fix)
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.clearRect(0, 0, width, height);
                    previousInfo = null;
                    savedState = null;
                    currentFrameIndex = -1;
                }

                // If we missed frames (shouldn't happen in our loop), we technically should catch up.
                // But we assume sequential access for export.
                if (frameIndex <= currentFrameIndex) return canvas; // Already there or behind (handled by reset above)

                // Advance from currentFrameIndex + 1 to frameIndex
                for (let i = currentFrameIndex + 1; i <= frameIndex; i++) {
                    const info = reader.frameInfo(i);

                    // Disposal from PREVIOUS frame
                    if (i > 0 && previousInfo) {
                        const { disposal, x, y, width: fW, height: fH } = previousInfo;
                        if (disposal === 2) {
                            ctx.clearRect(x, y, fW, fH);
                        } else if (disposal === 3 && savedState) {
                            ctx.putImageData(savedState, 0, 0);
                        }
                    }

                    // Save state for THIS frame if needed
                    if (info.disposal === 3) {
                        savedState = ctx.getImageData(0, 0, width, height);
                    }

                    // Draw THIS frame
                    rawFrameData.fill(0);
                    reader.decodeAndBlitFrameRGBA(i, rawFrameData);
                    const imageData = new ImageData(rawFrameData, width, height);
                    tempCtx.putImageData(imageData, 0, 0);
                    ctx.drawImage(tempCanvas, 0, 0);

                    previousInfo = info;
                }

                currentFrameIndex = frameIndex;
                const delay = reader.frameInfo(frameIndex).delay;
                return { canvas, delay };
            }
        };
    } catch (e) {
        console.error("Failed to load GIF:", url, e);
        return null; // Return null if not a valid GIF (maybe it's a static image masquerading?)
    }
}


export async function createVideoProcessor(url) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        // FIX: Do NOT set crossOrigin for blob/data URLs (local uploads)
        if (!url.startsWith('data:') && !url.startsWith('blob:')) {
            video.crossOrigin = "anonymous";
        }
        video.src = url;
        video.muted = true;
        video.playsInline = true;

        // Cleanup helper
        const cleanup = () => {
            video.pause();
            video.src = "";
            video.load();
        };

        video.onloadedmetadata = () => {
             // CAP DURATION to 5 seconds max for GIF export safety
             // For MP4 this can be relaxed later, but for consistency we keep it the same for now
            const MAX_DURATION = 5.0; // seconds
            const duration = Math.min(video.duration, MAX_DURATION);
            const width = video.videoWidth;
            const height = video.videoHeight;
            const fps = 30; // MP4 can use 30FPS comfortably
            const numFrames = Math.floor(duration * fps);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            console.log(`Initialized Video Processor: ${width}x${height}, ${duration}s cap, ${numFrames} frames`);


            resolve({
                width,
                height,
                numFrames,
                getDelay: () => 1000 / fps / 10, // delay in centiseconds (1/100s)
                renderFrame: async (frameIndex) => {
                    // ASYNC SEEK: Wait for video to actually seek before drawing
                    const time = frameIndex / fps;
                    video.currentTime = time;

                    await new Promise(r => {
                         // If already there (rare with floats), resolve. Else wait.
                         // But for robustness, just setting onseeked is safest.
                         const clean = () => {
                             video.removeEventListener('seeked', handler);
                             r();
                         };
                         const handler = () => clean();
                         video.addEventListener('seeked', handler, { once: true });

                         // Fallback in case seeked doesn't fire (browser quirk)
                         setTimeout(clean, 500);
                    });

                    // Clear and Draw
                    ctx.drawImage(video, 0, 0, width, height);

                    return { canvas, delay: Math.round(1000/fps/10) };
                },
                cleanup
            });

        };

        video.onerror = (e) => {
            console.error("Failed to load video for export", e);
            resolve(null);
        };
    });
}

export async function loadMemeAssets(meme, stickers) {
    const gifProcessors = {};
    const staticImages = {};
    const stickerProcessors = {};
    const stickerImages = {};

    // Helper: get a usable URL for loading, with sourceBlob fallback for stale blob URLs
    const getLoadableUrl = (item) => {
        if (item.url && !item.url.startsWith('blob:')) return item.url; // Regular URLs are always fine
        if (item.url) return item.url; // Try the blob URL first
        // If no URL but we have a sourceBlob, create a fresh one
        if (item.sourceBlob instanceof Blob) {
            return URL.createObjectURL(item.sourceBlob);
        }
        return null;
    };

    // Helper: attempt to load an image with sourceBlob fallback
    const loadImageWithFallback = async (item) => {
        const url = item.url || (item.sourceBlob instanceof Blob ? URL.createObjectURL(item.sourceBlob) : null);
        if (!url) return null;
        try {
            const img = new Image();
            if (!url.startsWith('data:') && !url.startsWith('blob:')) {
                img.crossOrigin = "anonymous";
            }
            img.src = url;
            await img.decode();
            return img;
        } catch (err) {
            // If blob URL failed and we have sourceBlob, try a fresh URL
            if (url.startsWith('blob:') && item.sourceBlob instanceof Blob) {
                try {
                    const freshUrl = URL.createObjectURL(item.sourceBlob);
                    const img = new Image();
                    img.src = freshUrl;
                    await img.decode();
                    return img;
                } catch (retryErr) {
                    console.warn("Retry with sourceBlob also failed:", retryErr);
                }
            }
            console.warn("Failed to load/decode image:", url.substring(0, 50) + "...", err);
            return null;
        }
    };

    await Promise.all(meme.panels.map(async (panel) => {
        const url = getLoadableUrl(panel);
        if (!url) return;

        let processor = null;

        // FIX: Check for GIF FIRST (isGif flag, URL pattern, or data URL mime type)
        // This prevents GIFs from being incorrectly routed to createVideoProcessor
        // which fails because <video> elements cannot load animated GIFs.
        // Blob URLs from user uploads don't contain '.gif', so the isGif flag is critical.
        const isGif = panel.isGif ||
                      url.includes('.gif') ||
                      url.startsWith('data:image/gif');

        // Only treat as video if it's NOT a GIF
        const isVideo = !isGif && (
            panel.isVideo ||
            url.startsWith('data:video') ||
            url.match(/\.(mp4|webm|mov)$/i)
        );

        if (isGif) {
            processor = await createGifProcessor(url);
            // Fallback: if blob URL failed, try sourceBlob
            if (!processor && panel.sourceBlob instanceof Blob) {
                const freshUrl = URL.createObjectURL(panel.sourceBlob);
                processor = await createGifProcessor(freshUrl);
            }
        } else if (isVideo) {
            processor = await createVideoProcessor(url);
        }

        if (processor) {
            gifProcessors[panel.id] = processor;
        } else if (!isGif || !processor) {
            // Fallback to Static Image (if not animated or processor failed)
            const img = await loadImageWithFallback(panel);
            if (img) staticImages[panel.id] = img;
        }
    }));

    await Promise.all((stickers || []).filter(s => s.type === 'image' || s.type === 'giphy' || s.type === 'tenor').map(async (s) => {
        let processor = null;
        if (s.isAnimated || s.url.includes('.gif')) {
            processor = await createGifProcessor(s.url);
            // Fallback: try sourceBlob if blob URL failed
            if (!processor && s.sourceBlob instanceof Blob) {
                const freshUrl = URL.createObjectURL(s.sourceBlob);
                processor = await createGifProcessor(freshUrl);
            }
            if (processor) stickerProcessors[s.id] = processor;
        }

        if (!processor) {
            const img = await loadImageWithFallback(s);
            if (img) stickerImages[s.id] = img;
        }
    }));

    return { gifProcessors, staticImages, stickerProcessors, stickerImages };
}

/* =========================================================================================
   DIMENSIONS CALCULATION
   ========================================================================================= */

export function calculateDimensions(meme, assets) {
    let containerAspect = 1;
    let exportWidth = 1600; // Default base resolution (2x Quality)
    let exportHeight = 1600;
    const baseWidth = 800; // Reference width for scaling calculations (matches MemeCanvas)
    const { gifProcessors, staticImages } = assets;

    // Check if we actually have any valid panels (url OR loaded assets from sourceBlob fallback)
    const hasValidPanel = meme.panels && meme.panels.length > 0 && (
        meme.panels[0].url || gifProcessors[meme.panels[0].id] || staticImages[meme.panels[0].id]
    );

    if (meme.stickersOnly) {
        // Force standardized sticker size (e.g. for Telegram/Signal/WhatsApp)
        exportWidth = 512;
        exportHeight = 512;
        containerAspect = 1;
    } else if (hasValidPanel) {
        if (meme.layout === 'single') {
            const pid = meme.panels[0].id;
            let rawWidth = 800;
            let rawHeight = 800;

            if (gifProcessors[pid]) {
                rawWidth = gifProcessors[pid].width;
                rawHeight = gifProcessors[pid].height;
            } else if (staticImages[pid]) {
                rawWidth = staticImages[pid].width;
                rawHeight = staticImages[pid].height;
            }

            // QUALITY UPGRADE: Enforce minimum width of 1080px for crisp text
            // If the source (GIF/Image) is smaller, we upscale the canvas dimensions.
            // The browser/canvas will handle scaling the image, and text will be drawn at high res.
            const MIN_EXPORT_WIDTH = 1080;
            if (rawWidth < MIN_EXPORT_WIDTH) {
                const scale = MIN_EXPORT_WIDTH / rawWidth;
                exportWidth = Math.round(rawWidth * scale);
                exportHeight = Math.round(rawHeight * scale);
                console.log(`Upscaling export from ${rawWidth}x${rawHeight} to ${exportWidth}x${exportHeight} for text quality.`);
            } else {
                exportWidth = rawWidth;
                exportHeight = rawHeight;
            }

            // If asset load failed but url exists, we might default to 800x800 or generic
            containerAspect = exportWidth / exportHeight;
        } else if (meme.layout === 'top-bottom') {
            containerAspect = 3 / 4;
            exportWidth = 1080; // Standard high res
        } else if (meme.layout === 'side-by-side') {
            containerAspect = 4 / 3;
            exportWidth = 1080; // Standard high res
        }

        if (meme.layout !== 'single') {
            exportHeight = Math.round(exportWidth / containerAspect);
        }
    } else {
        // No panels (Empty Canvas / Sticker Only mode)
        console.log("No valid panels found, defaulting to 1600x1600 square canvas");
        exportWidth = 1600;
        exportHeight = 1600;
        containerAspect = 1;
    }

    const paddingTop = meme.paddingTop || 0;
    const paddingBottom = meme.paddingBottom || 0;
    const contentOffsetY = paddingTop > 0 ? Math.round(exportWidth * (paddingTop / 100)) : 0;
    const contentOffsetBottom = paddingBottom > 0 ? Math.round(exportWidth * (paddingBottom / 100)) : 0;
    const contentHeight = exportHeight;
    exportHeight = contentHeight + contentOffsetY + contentOffsetBottom;

    return { exportWidth, exportHeight, contentHeight, contentOffsetY, contentOffsetBottom, baseWidth };
}

/* =========================================================================================
   TEXT DRAWING (Used internally by renderMemeFrame)
   ========================================================================================= */

function drawText(ctx, texts, meme, exportWidth, exportHeight, padding = 0, currentTimeMs = 0, totalFrames = 1) {
    // 2. Add Text
    texts.forEach((text, index) => {
        if (!text.content) return;

        // Apply animations if present
        let xOffset = 0;
        let yOffset = 0;
        let rotation = 0;
        let scale = 1;
        let opacity = 1;

        // NEW: Handle Wave Text specifically (character-level animation)
        // Since canvas text drawing is monolithic (fillText), we can't easily animate per-character
        // UNLESS we break the text rendering into individual characters.
        // For now, simpler animations (pulse, slide, shake) are applied to the whole text block.
        // Complex per-character wave needs significant refactoring of wrapText, so we fallback
        // to a simpler "bob" or "shake" for Wave text in export for V1.
        // Future optimization: Implement per-character drawing in wrapText.

        if (text.animation && text.animation !== 'none') {
            const anim = getAnimationById(text.animation);
            if (anim && anim.getTransform) {
                // TIME-BASED ANIMATION: Use passed currentTimeMs
                const animDurationMs = anim.duration || 1000;
                // Progress within this animation's cycle (0 to 1, repeating)
                const animProgress = (currentTimeMs % animDurationMs) / animDurationMs;
                // Virtual frame index 0..totalFrames
                const virtualFrameIndex = animProgress * totalFrames;

                const t = anim.getTransform(virtualFrameIndex, totalFrames);
                xOffset = (t.offsetX || 0) * (exportWidth / 800);
                yOffset = (t.offsetY || 0) * (exportWidth / 800);
                rotation = (t.rotation || 0) * (Math.PI / 180);
                scale = t.scale || 1;
                opacity = t.opacity ?? 1;
            }
        }

        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = text.color || 'white';
        ctx.strokeStyle = text.strokeColor || 'black';
        ctx.globalAlpha = opacity;

        // Base font size scaling relative to exportWidth vs 800px base
        const baseFontSize = (text.fontSize || 40);
        const fontSize = baseFontSize * (exportWidth / 800) * scale;
        // FIX: Use the selected font family! (Default to Impact/Roboto if missing)
        // We must quote the font name in case it has spaces (e.g. "Comic Sans MS")
        const fontFamily = text.fontFamily || meme.fontFamily || 'Impact';
        ctx.font = `900 ${fontSize}px "${fontFamily}", sans-serif`;
        ctx.lineWidth = (text.strokeWidth || 3) * (exportWidth / 800) * scale;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;

        let x, y;
        if (text.isFloating) {
            x = (text.x / 100) * exportWidth;
            y = (text.y / 100) * exportHeight;
        } else {
            // Standard Top/Bottom layout logic
            x = exportWidth / 2;
             // Adjust y for top/bottom text to account for padding
             // Top text stays at top (offset by padding)
             // Bottom text stays at bottom (offset by padding)
             // We need to check index to know if it's top (0) or bottom (1) standard text
            if (index === 0 && !text.isFloating) {
                 y = (text.y / 100) * exportHeight; // Usually top
            } else if (index === 1 && !text.isFloating) {
                 y = (text.y / 100) * exportHeight; // Usually bottom
            } else {
                y = (text.y / 100) * exportHeight;
            }
        }

        // Apply Animation Transforms
        ctx.translate(x + xOffset, y + yOffset);
        ctx.rotate(rotation);

        // Shadow Support
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Wrap Text
        const maxWidth = (text.maxWidth || 90) / 100 * exportWidth;
        const lineHeight = fontSize * 1.2;

        const words = text.content.split(' ');
        let line = '';
        let lines = [];

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        lines.forEach((l, i) => {
            // Center vertically around the anchor point if multiple lines?
            // Standard meme text usually grows down or up from anchor.
            // Let's stick to simple line offsets.
            const lineY = (i - (lines.length - 1) / 2) * lineHeight;
            if (text.strokeWidth > 0) ctx.strokeText(l, 0, lineY);
            ctx.fillText(l, 0, lineY);
        });

        ctx.restore();
    });
}

/* =========================================================================================
   DEEP FRY EFFECT
   ========================================================================================= */

export function applyDeepFry(ctx, x, y, w, h, intensity = 50) {
    if (intensity <= 0) return;

    try {
        const imageData = ctx.getImageData(x, y, w, h);
        const data = imageData.data;
        const factor = (intensity / 100) * 50; // 0 to 50 factor

        for (let i = 0; i < data.length; i += 4) {
            // Saturation boost
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const max = Math.max(r, g, b);
            if (max !== 0) {
                data[i] += (data[i] - max) * (-factor);
                data[i + 1] += (data[i + 1] - max) * (-factor);
                data[i + 2] += (data[i + 2] - max) * (-factor);
            }

            // Contrast boost
            data[i] = (data[i] - 128) * (1 + factor / 10) + 128;
            data[i + 1] = (data[i + 1] - 128) * (1 + factor / 10) + 128;
            data[i + 2] = (data[i + 2] - 128) * (1 + factor / 10) + 128;

            // Noise
            const noise = (Math.random() - 0.5) * factor * 10;
            data[i] += noise;
            data[i + 1] += noise;
            data[i + 2] += noise;
        }

        ctx.putImageData(imageData, x, y);

        // JPEG Artifacting simulation (using low quality scale/draw)
        // Draw to small temporary canvas then scale back up
        const smallCanvas = document.createElement('canvas');
        const sw = Math.max(1, w / (1 + intensity / 20));
        const sh = Math.max(1, h / (1 + intensity / 20));
        smallCanvas.width = sw;
        smallCanvas.height = sh;
        const sctx = smallCanvas.getContext('2d');
        sctx.drawImage(ctx.canvas, x, y, w, h, 0, 0, sw, sh);

        // Draw back (pixelated)
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(smallCanvas, 0, 0, sw, sh, x, y, w, h);
        ctx.restore();

    } catch (e) {
        console.warn("Deep fry application failed:", e);
    }
}

/* =========================================================================================
   CORE RENDER FUNCTION - Renders a single frame
   ========================================================================================= */

export async function renderMemeFrame(ctx, meme, stickers, texts, frameIndex, assets, dimensions, options = {}) {
    const { gifProcessors, staticImages, stickerProcessors, stickerImages } = assets;
    const { exportWidth, exportHeight, contentHeight, contentOffsetY, baseWidth = 800 } = dimensions;
    const { stickersOnly = false, totalFrames = 1, exportDelayMs = 100, gifLoopDurationMs = 1000, currentTimeMs = null } = options;
    // Use passed currentTimeMs for accurate timing, or calculate from frame index as fallback
    const effectiveTimeMs = currentTimeMs !== null ? currentTimeMs : frameIndex * exportDelayMs;


    // MOBILE FIX: Ensure canvas context is valid before proceeding
    if (!ctx || typeof ctx.fillRect !== 'function') {
        console.error('Canvas context unavailable - possible memory issue on mobile');
        return;
    }

    ctx.globalCompositeOperation = 'source-over';

    // MOBILE FIX: For regular export, fill FIRST then content - prevents transparent flash on iOS
    // For stickersOnly mode, we need true transparency so clear only
    if (!stickersOnly) {
        const paddingTop = meme.paddingTop || 0;
        const paddingBottom = meme.paddingBottom || 0;

        // Black background FIRST (before any clear) - iOS Safari fix
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, exportWidth, exportHeight);

        // Top caption bar with custom color
        if (paddingTop > 0) {
            const topBarHeight = Math.round(exportWidth * (paddingTop / 100));
            ctx.fillStyle = meme.paddingTopColor || '#ffffff';
            ctx.fillRect(0, 0, exportWidth, topBarHeight);
        }

        // Bottom caption bar with custom color
        if (paddingBottom > 0) {
            const bottomBarHeight = Math.round(exportWidth * (paddingBottom / 100));
            ctx.fillStyle = meme.paddingBottomColor || '#ffffff';
            ctx.fillRect(0, exportHeight - bottomBarHeight, exportWidth, bottomBarHeight);
        }
    } else {
        // STICKERS ONLY: Need true transparency - clear to transparent
        ctx.clearRect(0, 0, exportWidth, exportHeight);
    }


    if (!stickersOnly) {
        for (const panel of meme.panels) {
            // FIX: Don't skip panels that have loaded assets even if panel.url is stale/null
            // This can happen after Dexie state restore when blob URLs weren't rehydrated
            const hasLoadedAsset = gifProcessors[panel.id] || staticImages[panel.id] || (assets.friedImages && assets.friedImages[panel.id]);
            if (!panel.url && !hasLoadedAsset) continue;

            const px = (panel.x / 100) * exportWidth;
            const py = (panel.y / 100) * contentHeight + contentOffsetY;
            const pw = (panel.w / 100) * exportWidth;
            const ph = (panel.h / 100) * contentHeight;

            let sourceCanvas = null;
            let srcW = 0, srcH = 0;
            // Check for PRE-FRIED static asset first
            let isPreFried = false;

            if (assets.friedImages && assets.friedImages[panel.id]) {
                sourceCanvas = assets.friedImages[panel.id];
                srcW = sourceCanvas.width;
                srcH = sourceCanvas.height;
                isPreFried = true;
            } else if (gifProcessors[panel.id]) {
                const proc = gifProcessors[panel.id];
                const frameIdx = frameIndex % proc.numFrames;
                // ASYNC AWAIT: Needed for Video Processor (GIF processor is sync but this works for both)
                const result = await proc.renderFrame(frameIdx);
                sourceCanvas = result.canvas;
                srcW = proc.width;
                srcH = proc.height;
            } else if (staticImages[panel.id]) {
                sourceCanvas = staticImages[panel.id];
                srcW = sourceCanvas.width;
                srcH = sourceCanvas.height;
            }

            if (sourceCanvas) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(px, py, pw, ph);
                ctx.clip();

                // MOBILE FIX: Ensure panel area has opaque background before drawing
                // Prevents transparency bleed-through on iOS/Android
                ctx.fillStyle = '#000000';
                ctx.fillRect(px, py, pw, ph);

                const f = panel.filters || {};
                const filterStr = `
                    contrast(${f.contrast ?? 100}%)
                    brightness(${f.brightness ?? 100}%)
                    blur(${f.blur ?? 0}px)
                    grayscale(${f.grayscale ?? 0}%)
                    sepia(${f.sepia ?? 0}%)
                    hue-rotate(${f.hueRotate ?? 0}deg)
                    saturate(${f.saturate ?? 100}%)
                    invert(${f.invert ?? 0}%)
                `.replace(/\s+/g, ' ').trim();

                if (filterStr !== 'none') ctx.filter = filterStr;

                const ratioW = pw / srcW;
                const ratioH = ph / srcH;
                // For single layout, default to contain (show full image); for multi-panel, default to cover (fill panel)
                const effectiveObjectFit = meme.layout === 'single'
                    ? (panel.objectFit || 'contain')
                    : (panel.objectFit || 'cover');
                const ratio = effectiveObjectFit === 'contain' ? Math.min(ratioW, ratioH) : Math.max(ratioW, ratioH);

                const newW = srcW * ratio;
                const newH = srcH * ratio;
                const offX = px + (pw - newW) / 2;
                const offY = py + (ph - newH) / 2;

                ctx.drawImage(sourceCanvas, 0, 0, srcW, srcH, offX, offY, newW, newH);

                // Only apply per-frame deep fry if it wasn't pre-calculated
                if (!isPreFried && (f.deepFry || 0) > 0) {
                    applyDeepFry(ctx, px, py, pw, ph, f.deepFry);
                }

                ctx.restore();
            }
        }
    }


    // TODO: Verify if drawings should be included in stickersOnly.
    // Assuming YES as they are "on top" layers often used with stickers.
    if (meme.drawings && meme.drawings.length > 0) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        meme.drawings.forEach(d => {
            if (!d.points || d.points.length < 2) return;
            ctx.beginPath();
            ctx.strokeStyle = d.color;
            ctx.lineWidth = d.width * (exportWidth / baseWidth);
            ctx.globalCompositeOperation = d.mode === 'eraser' ? 'destination-out' : 'source-over';

            ctx.moveTo(d.points[0].x * exportWidth, d.points[0].y * exportHeight);
            for (let j = 1; j < d.points.length; j++) {
                ctx.lineTo(d.points[j].x * exportWidth, d.points[j].y * exportHeight);
            }
            ctx.stroke();
        });
        ctx.restore();
    }


    // Use scaleFactor based on exportWidth / baseWidth (same as MemeCanvas uses containerWidth / 800)
    const scaleFactor = exportWidth / baseWidth;

    for (const sticker of (stickers || [])) {
        const x = (sticker.x / 100) * exportWidth;
        const y = (sticker.y / 100) * exportHeight;
        const size = (meme.stickerSize || 100) * (sticker.scale ?? 1) * scaleFactor;

        // Animation Transform
        let animX = x;
        let animY = y;
        let animRotation = (sticker.rotation || 0) * (Math.PI / 180);
        let animScaleX = 1;
        let animScaleY = 1;
        let animOpacity = 1;

        if (sticker.animation && sticker.animation !== 'none') {
            const anim = getAnimationById(sticker.animation);
            if (anim && anim.getTransform) {
                // TIME-BASED ANIMATION: Calculate progress based on current time in GIF loop
                // and the animation's own duration (from CSS)
                const currentTimeMs = effectiveTimeMs;
                const animDurationMs = anim.duration || 1000;

                // Progress within this animation's cycle (0 to 1, repeating)
                const animProgress = (currentTimeMs % animDurationMs) / animDurationMs;
                // Convert to virtual frame index for getTransform (which expects 0 to totalFrames)
                const virtualFrameIndex = animProgress * totalFrames;

                const t = anim.getTransform(virtualFrameIndex, totalFrames);

                animX += (t.offsetX || 0) * scaleFactor;
                animY += (t.offsetY || 0) * scaleFactor;
                animRotation += (t.rotation || 0) * (Math.PI / 180);

                const s = t.scale || 1;
                animScaleX = t.scaleX ?? s;
                animScaleY = t.scaleY ?? s;
                animOpacity = t.opacity ?? 1;
            }
        }

        ctx.save();
        ctx.globalAlpha = animOpacity;
        ctx.translate(animX, animY);
        ctx.rotate(animRotation);
        ctx.scale(animScaleX, animScaleY);

        if (sticker.type === 'image' || sticker.type === 'giphy' || sticker.type === 'tenor') {
            let drawCanvas = null;
            let sw = 0, sh = 0;

            if (stickerProcessors[sticker.id]) {
                const proc = stickerProcessors[sticker.id];
                // TIME-BASED FRAME SYNC: Calculate which source frame to show based on export timing
                // This ensures native GIF stickers play at their original speed regardless of export frame rate
                const exportTimeMs = effectiveTimeMs;  // Current time in the export loop

                // Use robust time-based lookup if available (for GIFs)
                let frameIdx = 0;

                if (proc.getFrameAtTime) {
                   frameIdx = proc.getFrameAtTime(exportTimeMs);
                } else {
                   // Fallback for simple processors (like video if not updated yet)
                   // Note: Video processor uses renderFrame(time) directly usually, but here we treat it as frames
                   const sourceGifDelayMs = (proc.getDelay(0) || 10) * 10;
                   const sourceGifLoopMs = proc.numFrames * sourceGifDelayMs;
                   const timeInSourceLoop = exportTimeMs % sourceGifLoopMs;
                   frameIdx = Math.floor(timeInSourceLoop / sourceGifDelayMs) % proc.numFrames;
                }

                const result = await proc.renderFrame(frameIdx);
                drawCanvas = result.canvas;
                sw = proc.width;
                sh = proc.height;
            } else if (stickerImages[sticker.id]) {
                drawCanvas = stickerImages[sticker.id];
                sw = drawCanvas.width;
                sh = drawCanvas.height;
            }

            if (drawCanvas) {
                const aspect = sh / sw;
                const drawWidth = size;
                const drawHeight = size * aspect;

                // Match CSS drop-shadow-md from preview: drop-shadow(0 4px 3px rgb(0 0 0 / 0.07)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.06))
                // Canvas shadow is simpler, so we approximate with a single shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
                ctx.shadowBlur = 3 * scaleFactor;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 3 * scaleFactor;

                // Draw centered at (0,0) because we translated to center
                ctx.drawImage(drawCanvas, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

                // Reset shadow after drawing sticker
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
        } else {
            // Emoji stickers - apply same drop shadow as image stickers
            ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
            ctx.shadowBlur = 3 * scaleFactor;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 3 * scaleFactor;

            ctx.font = `${size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sticker.url, 0, 0);

            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        ctx.restore();
    }


    if (!stickersOnly) {
        // TIME-BASED: Pass current time in ms for proper animation timing
        const currentTimeMs = effectiveTimeMs;
        drawText(ctx, texts, meme, exportWidth, exportHeight, 0, currentTimeMs, totalFrames);
    }
}
