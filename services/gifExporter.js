import GIF from 'gif.js';
import { GifReader } from 'omggif';
import { getAnimationById, hasAnimatedText, ANIMATED_TEXT_FRAMES, ANIMATED_TEXT_DELAY } from '../constants/textAnimations';

/**
 * Helper to create a processor for a single GIF source
 * Handles decoding, frame state, and disposal logic
 */
async function createGifProcessor(url) {
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
            getDelay: (index = 0) => reader.frameInfo(index).delay,
            // Renders the specific frame index to the internal canvas and returns it
            renderFrame: (frameIndex) => {
                // If we are asking for the next frame sequentially, great.
                // If we skipped or looped, we might need to reset or seek.
                // For simple looping (0 -> 1 -> ... -> N -> 0), we handle the wrap properly.

                if (frameIndex === 0 && currentFrameIndex !== -1) {
                    // Reset state for loop
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

/**
 * Exports a meme as an animated GIF
 * Supports Multi-Panel, Per-Panel Filters, and Deep Fry
 */
// --- REFACTORED HELPERS ---

/**
 * Loads all image and GIF assets for the meme
 */
async function loadMemeAssets(meme, stickers) {
    const gifProcessors = {};
    const staticImages = {};
    const stickerProcessors = {};
    const stickerImages = {};

    console.log("Loading assets for export...");

    // Load Panels
    await Promise.all(meme.panels.map(async (panel) => {
        if (!panel.url) return;

        let processor = null;
        if (panel.isVideo || panel.url.includes('.gif')) {
            processor = await createGifProcessor(panel.url);
            if (processor) {
                gifProcessors[panel.id] = processor;
            } else {
                console.warn("Failed to create GIF processor for:", panel.url);
            }
        }

        if (!processor) {
            try {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = panel.url;
                await img.decode();
                staticImages[panel.id] = img;
            } catch (err) {
                console.warn("Failed to load/decode image:", panel.url, err);
            }
        }
    }));

    // Load Stickers
    await Promise.all((stickers || []).filter(s => s.type === 'image').map(async (s) => {
        let processor = null;
        if (s.isAnimated || s.url.includes('.gif')) {
            processor = await createGifProcessor(s.url);
            if (processor) stickerProcessors[s.id] = processor;
        }

        if (!processor) {
            try {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = s.url;
                await img.decode();
                stickerImages[s.id] = img;
            } catch (err) {
                console.warn("Failed to load sticker:", s.url, err);
            }
        }
    }));

    return { gifProcessors, staticImages, stickerProcessors, stickerImages };
}

/**
 * Renders a single frame of the meme to the provided context
 */
function renderMemeFrame(ctx, meme, stickers, texts, frameIndex, assets, dimensions, options = {}) {
    const { gifProcessors, staticImages, stickerProcessors, stickerImages } = assets;
    const { exportWidth, exportHeight, contentHeight, contentOffsetY } = dimensions;
    const { stickersOnly = false } = options;

    // A. Clear & Background
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, exportWidth, exportHeight);

    // Only fill background if NOT in stickersOnly mode
    if (!stickersOnly) {
        const paddingTop = meme.paddingTop || 0;
        ctx.fillStyle = paddingTop > 0 ? '#ffffff' : '#000000';
        ctx.fillRect(0, 0, exportWidth, exportHeight);
    }

    // B. Draw Panels (Skip if stickersOnly)
    if (!stickersOnly) {
        for (const panel of meme.panels) {
            if (!panel.url) continue;

            const px = (panel.x / 100) * exportWidth;
            const py = (panel.y / 100) * contentHeight + contentOffsetY;
            const pw = (panel.w / 100) * exportWidth;
            const ph = (panel.h / 100) * contentHeight;

            let sourceCanvas = null;
            let srcW = 0, srcH = 0;

            if (gifProcessors[panel.id]) {
                const proc = gifProcessors[panel.id];
                const frameIdx = frameIndex % proc.numFrames;
                const result = proc.renderFrame(frameIdx);
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
                const ratio = panel.objectFit === 'contain' ? Math.min(ratioW, ratioH) : Math.max(ratioW, ratioH);

                const newW = srcW * ratio;
                const newH = srcH * ratio;
                const offX = px + (pw - newW) / 2;
                const offY = py + (ph - newH) / 2;

                ctx.drawImage(sourceCanvas, 0, 0, srcW, srcH, offX, offY, newW, newH);

                if ((f.deepFry || 0) > 0) {
                    applyDeepFry(ctx, px, py, pw, ph, f.deepFry);
                }

                ctx.restore();
            }
        }
    }

    // C. Draw Drawings
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
            ctx.lineWidth = d.width * (exportWidth / 800);
            ctx.globalCompositeOperation = d.mode === 'eraser' ? 'destination-out' : 'source-over';

            ctx.moveTo(d.points[0].x * exportWidth, d.points[0].y * exportHeight);
            for (let j = 1; j < d.points.length; j++) {
                ctx.lineTo(d.points[j].x * exportWidth, d.points[j].y * exportHeight);
            }
            ctx.stroke();
        });
        ctx.restore();
    }

    // D. Draw Stickers
    for (const sticker of (stickers || [])) {
        const x = (sticker.x / 100) * exportWidth;
        const y = (sticker.y / 100) * exportHeight;
        const size = (meme.stickerSize || 60) * (exportWidth / 800);

        if (sticker.type === 'image') {
            let drawCanvas = null;
            let sw = 0, sh = 0;

            if (stickerProcessors[sticker.id]) {
                const proc = stickerProcessors[sticker.id];
                const frameIdx = frameIndex % proc.numFrames;
                const result = proc.renderFrame(frameIdx);
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
                ctx.drawImage(drawCanvas, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
            }
        } else {
            ctx.font = `${size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Determine text color - default black unless dark mode logic needed? 
            // Stick to meme creator default (usually just renders the emoji text as is)
            ctx.fillText(sticker.url, x, y);
        }
    }

    // E. Draw Text (Skip if stickersOnly? User said "Export Stickers Only", but conventionally overlay text is kept or separated.
    // If the goal is "transparent stickers", text is usually considered a sticker-like overlay.
    // I will INCLUDE text in stickersOnly mode for now, as it's useful to have text transparency too.)
    drawText(ctx, texts, meme, exportWidth, exportHeight, 0, frameIndex, 0); // maxFrames passed as 0 or dummy, drawText handles it
}

/**
 * Calculates export dimensions
 */
function calculateDimensions(meme, assets) {
    let containerAspect = 1;
    let exportWidth = 800;
    let exportHeight = 800;
    const { gifProcessors, staticImages } = assets;

    if (meme.layout === 'single' && meme.panels[0].url) {
        const pid = meme.panels[0].id;
        if (gifProcessors[pid]) {
            exportWidth = gifProcessors[pid].width;
            exportHeight = gifProcessors[pid].height;
        } else if (staticImages[pid]) {
            exportWidth = staticImages[pid].width;
            exportHeight = staticImages[pid].height;
        }
        containerAspect = exportWidth / exportHeight;
    } else if (meme.layout === 'top-bottom') {
        containerAspect = 3 / 4;
    } else if (meme.layout === 'side-by-side') {
        containerAspect = 4 / 3;
    }

    if (meme.layout !== 'single') {
        exportHeight = Math.round(exportWidth / containerAspect);
    }

    const paddingTop = meme.paddingTop || 0;
    const contentOffsetY = paddingTop > 0 ? Math.round(exportWidth * (paddingTop / 100)) : 0;
    const contentHeight = exportHeight;
    exportHeight = contentHeight + contentOffsetY;

    return { exportWidth, exportHeight, contentHeight, contentOffsetY };
}


/**
 * Export Stickers (or any static state) as PNG with Transparency
 */
export async function exportStickersAsPng(meme, stickers) {
    // 1. Load Assets
    const assets = await loadMemeAssets(meme, stickers);

    // 2. Dimensions
    const dimensions = calculateDimensions(meme, assets);
    const { exportWidth, exportHeight } = dimensions;

    // 3. Render Frame 0
    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d');

    renderMemeFrame(ctx, meme, stickers, meme.texts, 0, assets, dimensions, { stickersOnly: true });

    // 4. Export as Blob
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/png');
    });
}


/**
 * Exports a meme as an animated GIF
 */
export async function exportGif(meme, texts, stickers) {
    return new Promise(async (resolve, reject) => {
        try {
            // 1. Load Assets
            const assets = await loadMemeAssets(meme, stickers);
            const { gifProcessors, stickerProcessors } = assets;

            // 2. Dimensions
            const dimensions = calculateDimensions(meme, assets);
            const { exportWidth, exportHeight } = dimensions;

            // 3. Initialize Encoder
            const base = import.meta.env.BASE_URL || '/';
            const workerPath = `${base}gif.worker.js`.replace(/\/+/g, '/');

            let workerBlobUrl = null;
            try {
                const response = await fetch(workerPath);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const workerScriptText = await response.text();
                const blob = new Blob([workerScriptText], { type: 'application/javascript' });
                workerBlobUrl = URL.createObjectURL(blob);
            } catch (err) {
                console.error("Worker load failed:", err);
                workerBlobUrl = workerPath;
            }

            const gif = new GIF({
                workers: 4,
                quality: 10,
                width: exportWidth,
                height: exportHeight,
                workerScript: workerBlobUrl,
                repeat: 0,
                // For stickersOnly GIF export, we try our best with transparency
                transparent: meme.stickersOnly ? 0x00000000 : null,
                background: meme.stickersOnly ? null : '#000000'
            });

            // 4. Determine Loop Length
            let maxFrames = 1;
            let masterDelay = 10;
            const activeProcessors = [...Object.values(gifProcessors), ...Object.values(stickerProcessors)];

            if (meme.forceStatic) {
                maxFrames = 1;
            } else if (activeProcessors.length > 0) {
                maxFrames = Math.max(...activeProcessors.map(p => p.numFrames));
                masterDelay = activeProcessors[0].getDelay(0) || 10;
            } else if (hasAnimatedText(texts) || (stickers && stickers.length > 0)) {
                maxFrames = ANIMATED_TEXT_FRAMES;
                masterDelay = ANIMATED_TEXT_DELAY;
                console.log('Animation needed on static image (text animation or stickers), creating GIF with', maxFrames, 'frames');
            } else {
                maxFrames = 1;
            }

            if (maxFrames > 300) {
                console.warn(`Clamping GIF frames from ${maxFrames} to 300`);
                maxFrames = 300;
            }
            console.log(`Exporting ${maxFrames} frames...`);

            const canvas = document.createElement('canvas');
            canvas.width = exportWidth;
            canvas.height = exportHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // 5. Render Loop
            for (let i = 0; i < maxFrames; i++) {
                await new Promise(r => setTimeout(r, 10));

                // Use Refactored Render Function
                renderMemeFrame(ctx, meme, stickers, texts, i, assets, dimensions, { stickersOnly: meme.stickersOnly });

                gif.addFrame(canvas, {
                    delay: masterDelay * 10,
                    copy: true,
                    disposal: 2 // Restore to background (transparent) to prevent ghosting
                });
            }

            // 6. Finish
            const timeoutId = setTimeout(() => {
                try { gif.abort(); } catch (e) { }
                if (workerBlobUrl && workerBlobUrl.startsWith('blob:')) URL.revokeObjectURL(workerBlobUrl);
                reject(new Error("Encoding timed out. Worker likely failed to start."));
            }, 60000);

            gif.on('finished', (blob) => {
                clearTimeout(timeoutId);
                if (workerBlobUrl && workerBlobUrl.startsWith('blob:')) URL.revokeObjectURL(workerBlobUrl);
                resolve(blob);
            });

            gif.on('progress', (p) => {
                // You could pass this up to a callback if needed, but for now we'll just log
                console.log(`Encoding progress: ${Math.round(p * 100)}%`);
            });

            gif.render();

        } catch (err) {
            reject(err);
        }
    });
}

// --- Helpers ---

function applyDeepFry(ctx, x, y, w, h, level) {
    // Ensure integer coordinates for ImageData
    x = Math.floor(x); y = Math.floor(y);
    w = Math.floor(w); h = Math.floor(h);
    if (w <= 0 || h <= 0) return;

    const imageData = ctx.getImageData(x, y, w, h);
    const data = imageData.data;

    const contrastFactor = 1 + (level / 20);
    const noiseAmount = level * 1.5;
    const satBoost = 1 + (level / 50);

    for (let p = 0; p < data.length; p += 4) {
        let r = data[p];
        let g = data[p + 1];
        let b = data[p + 2];

        const noise = (Math.random() - 0.5) * noiseAmount;
        r += noise;
        g += noise + (level * 0.2);
        b += noise;

        r = (r - 128) * contrastFactor + 128;
        g = (g - 128) * contrastFactor + 128;
        b = (b - 128) * contrastFactor + 128;

        const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
        r = gray + (r - gray) * satBoost;
        g = gray + (g - gray) * satBoost;
        b = gray + (b - gray) * satBoost;

        data[p] = r < 0 ? 0 : r > 255 ? 255 : r;
        data[p + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        data[p + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
    ctx.putImageData(imageData, x, y);
}

function drawText(ctx, texts, meme, width, height, offsetY, frameIndex = 0, totalFrames = 1) {
    const scale = width / 800;

    for (const textItem of texts) {
        if (!textItem.content.trim()) continue;

        const baseX = (textItem.x / 100) * width;
        const baseY = (textItem.y / 100) * height + offsetY;
        const fontSize = (meme.fontSize || 40) * scale;
        const stroke = Math.max(1, fontSize / 25);
        const baseRotation = (textItem.rotation || 0) * (Math.PI / 180);
        const maxWidth = ((meme.maxWidth || 80) / 100) * width;
        const lineHeight = fontSize * 1.2;

        // Get animation transform for this frame
        let animX = baseX;
        let animY = baseY;
        let animRotation = baseRotation;
        let animScaleX = 1;
        let animScaleY = 1;
        let animOpacity = 1;

        if (textItem.animation && textItem.animation !== 'none') {
            const anim = getAnimationById(textItem.animation);
            if (anim && anim.getTransform) {
                const transform = anim.getTransform(frameIndex, totalFrames, 0, 1);
                animX += (transform.offsetX || 0) * scale;
                animY += (transform.offsetY || 0) * scale;
                animRotation += (transform.rotation || 0) * (Math.PI / 180);

                // Support both uniform 'scale' and independent 'scaleX/scaleY'
                const uniformScale = transform.scale || 1;
                animScaleX = transform.scaleX ?? uniformScale;
                animScaleY = transform.scaleY ?? uniformScale;

                animOpacity = transform.opacity ?? 1;
            }
        }

        ctx.save();
        ctx.globalAlpha = animOpacity;
        ctx.translate(animX, animY);
        ctx.rotate(animRotation);
        ctx.scale(animScaleX, animScaleY);

        ctx.font = `bold ${fontSize}px ${meme.fontFamily || 'Impact'}, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Letter spacing implementation (Canvas doesn't support it natively in all contexts yet)
        if (ctx.letterSpacing !== undefined) {
            ctx.letterSpacing = `${(meme.letterSpacing || 0) * scale}px`;
        } else {
            // Fallback or ignore for now (complex manual drawing required for reliable cross-browser letter-spacing)
            // Canvas letterSpacing is supported in recent Chrome/Firefox/Safari
            ctx.canvas.style.letterSpacing = `${(meme.letterSpacing || 0) * scale}px`;
        }

        const lines = [];
        const rawLines = textItem.content.toUpperCase().split('\n');

        for (const rawLine of rawLines) {
            const words = rawLine.split(' ');
            let currentLine = words[0];

            for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const w = ctx.measureText(currentLine + " " + word).width;
                if (w < maxWidth) {
                    currentLine += " " + word;
                } else {
                    lines.push(currentLine);
                    currentLine = word;
                }
            }
            lines.push(currentLine);
        }

        const totalHeight = lines.length * lineHeight;
        const startY = -(totalHeight / 2) + (lineHeight / 2);

        if (meme.textBgColor && meme.textBgColor !== 'transparent') {
            let maxLineWidth = 0;
            lines.forEach(line => {
                const w = ctx.measureText(line).width;
                if (w > maxLineWidth) maxLineWidth = w;
            });

            const bgWidth = maxLineWidth + (fontSize * 1.0);
            const bgHeight = totalHeight + (fontSize * 0.5);

            ctx.fillStyle = meme.textBgColor;
            const radius = fontSize * 0.15;
            const bx = -bgWidth / 2;
            const by = -(totalHeight / 2) - (fontSize * 0.25);

            ctx.beginPath();
            ctx.roundRect(bx, by, bgWidth, bgHeight, radius);
            ctx.fill();
        }

        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4 * scale;
        ctx.shadowOffsetY = 2 * scale;
        ctx.lineWidth = stroke * 2;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = meme.textShadow || '#000000';
        ctx.fillStyle = meme.textColor || '#ffffff';

        lines.forEach((line, index) => {
            const lineY = startY + (index * lineHeight);

            if (textItem.animation === 'wave') {
                // Per-character Wave
                const lineWidth = ctx.measureText(line).width;
                let currentX = -lineWidth / 2; // Start from center (centered text alignment)

                const chars = line.split('');
                chars.forEach((char, charIdx) => {
                    const charWidth = ctx.measureText(char).width;
                    const anim = getAnimationById('wave');
                    // Calculate absolute index if needed, or just relative to line
                    // To make it continous across lines, we might want a global index, but per-line is usually fine
                    const transform = anim.getTransform(frameIndex, totalFrames, charIdx);

                    const charY = lineY + (transform.offsetY || 0) * scale;

                    ctx.strokeText(char, currentX + charWidth / 2, charY);
                    ctx.fillText(char, currentX + charWidth / 2, charY);

                    currentX += charWidth;
                });
            } else {
                // Standard block animation
                ctx.strokeText(line, 0, lineY);
                ctx.fillText(line, 0, lineY);
            }
        });

        ctx.restore();
    }
}