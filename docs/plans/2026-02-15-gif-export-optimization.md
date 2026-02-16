# GIF Export Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce GIF export sizes from 20-45MB to <8MB (download) / <3MB (share) by replacing gif.js with gifenc + gifsicle-wasm post-processing.

**Architecture:** Two-tier pipeline — gifenc encodes raw GIF frames with per-frame palettes, then gifsicle-wasm-browser post-processes with lossy compression and frame disposal optimization. The `action` parameter ('download' vs 'share') selects the tier config (resolution cap, lossy level, color count).

**Tech Stack:** gifenc (9KB, pure JS GIF encoder), gifsicle-wasm-browser (~150KB, WASM-based GIF optimizer)

**Do NOT commit the design doc.** Remove `docs/plans/2026-02-15-gif-export-optimization-design.md` and this plan file after implementation is verified.

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install new deps, remove old**

```bash
npm install gifenc gifsicle-wasm-browser && npm uninstall gif.js
```

**Step 2: Verify install**

```bash
node -e "require('gifenc'); console.log('gifenc OK')"
node -e "require('gifsicle-wasm-browser'); console.log('gifsicle-wasm OK')"
```

Expected: Both print OK, no errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: replace gif.js with gifenc + gifsicle-wasm-browser"
```

---

### Task 2: Wire `action` Parameter Through to Worker

The `action` parameter ('download' | 'share') already exists on `exportMemeAsGif()` but is never forwarded to the worker. We need it in the worker to select the right tier config.

**Files:**
- Modify: `services/gifExporter.js:85-96` (worker.postMessage payload)
- Modify: `services/exportWorker.js:28` (startExport destructuring)
- Modify: `services/exportWorker.js:45` (exportGif call)

**Step 1: Add `action` to worker payload in gifExporter.js**

In `services/gifExporter.js`, find the `worker.postMessage` call (line 85-96). Add `action` to the payload:

```js
// Start Export
worker.postMessage({
    type: 'START_EXPORT',
    payload: {
        exportId,
        meme: structuredClone(meme),
        texts: structuredClone(texts),
        stickers: structuredClone(stickers),
        quality,
        action,          // <-- ADD THIS
        format: 'gif',
        videoProxyPort: port2
    }
}, [port2]); // Transfer port2
```

**Step 2: Accept `action` in exportWorker.js startExport**

In `services/exportWorker.js`, update the `startExport` function signature (line 28) and pass it through:

```js
async function startExport({ meme, texts, stickers, quality, format, action, videoProxyPort }) {
```

Then update the exportGif call (line 45):

```js
if (format === 'gif') {
    await exportGif(meme, texts, stickers, assets, quality, action);
}
```

**Step 3: Accept `action` in exportGif signature**

Update the exportGif function signature (line 51):

```js
async function exportGif(meme, texts, stickers, assets, quality, action) {
```

**Step 4: Commit**

```bash
git add services/gifExporter.js services/exportWorker.js
git commit -m "feat: forward action parameter to export worker for tier selection"
```

---

### Task 3: Replace gif.js Encoder with gifenc in exportWorker.js

This is the core change. Replace the gif.js encoding pipeline with gifenc's quantize → applyPalette → writeFrame pipeline, and add gifsicle-wasm post-processing.

**Files:**
- Modify: `services/exportWorker.js` — rewrite `exportGif()` function (lines 51-186)

**Step 1: Update imports**

Replace the gif.js import (line 3) with gifenc + gifsicle:

```js
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
```

Remove this line:
```js
import GIF from 'gif.js';
```

**Step 2: Rewrite the exportGif function**

Replace the entire `exportGif()` function (lines 51-186) with:

```js
async function exportGif(meme, texts, stickers, assets, quality, action) {
    // --- 1. Tier Config ---
    const isShare = action === 'share';
    const MAX_GIF_DIMENSION = isShare ? 480 : 800;
    const LOSSY_LEVEL = isShare ? 60 : 30;
    const GIFSICLE_COLORS = isShare ? '--colors 128' : '';

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

    // --- 3. Frame Timing (unchanged logic) ---
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

    // GIF delay is in centiseconds (1/100th second), gifenc expects milliseconds
    const gifencDelay = delay;

    for (let i = 0; i < totalFrames; i++) {
        await renderMemeFrame(ctx, meme, stickers, texts, i, assets, dimensions, {
            stickersOnly: false,
            totalFrames,
            exportDelayMs: delay
        });

        const imageData = ctx.getImageData(0, 0, exportWidth, exportHeight);
        const { data } = imageData;

        // Quantize RGBA pixels to 256-color palette
        const palette = quantize(data, 256, { format: 'rgb565' });
        // Map RGBA pixels to palette indices
        const index = applyPalette(data, palette, 'rgb565');

        // Write frame with per-frame palette
        gif.writeFrame(index, exportWidth, exportHeight, {
            palette,
            delay: gifencDelay,
            repeat: 0, // loop forever (first frame only sets this, but safe to pass every time)
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
```

**Key differences from old code:**
- `GIFEncoder()` constructor takes no args (vs gif.js needing workers/quality/width/height/workerScript/dither)
- Per-frame `quantize()` + `applyPalette()` replaces gif.js's internal NeuQuant
- `gif.finish()` + `gif.bytes()` is synchronous (vs gif.js async `gif.render()` + event listener)
- gifsicle post-processing is a graceful fallback — if WASM fails to load in the worker, the raw gifenc output is still used (just without lossy optimization)
- `MAX_GIF_DIMENSION` is tier-dependent (800px download, 480px share) vs old static 1200px

**Step 3: Commit**

```bash
git add services/exportWorker.js
git commit -m "feat: replace gif.js with gifenc + gifsicle-wasm for smaller GIF exports"
```

---

### Task 4: Clean Up Dead Code

**Files:**
- Delete: `public/gif.worker.js` (gif.js sub-worker, no longer needed)
- Modify: `services/gifExporter.js` — remove unused gif.js import (line 1)

**Step 1: Delete gif.worker.js**

```bash
rm public/gif.worker.js
```

**Step 2: Remove dead import in gifExporter.js**

Line 1 of `services/gifExporter.js`:
```js
import GIF from 'gif.js';
```
Remove this line entirely. It was only used by the old worker path. The worker imports its own encoder now.

Also remove the unused `applyDeepFry` import from line 3 if it's not used elsewhere in the file (check — it's imported but never called in gifExporter.js):

```js
// Before
import { loadMemeAssets, renderMemeFrame, calculateDimensions, applyDeepFry } from './renderService';

// After
import { loadMemeAssets, renderMemeFrame, calculateDimensions } from './renderService';
```

Also remove the dead `createTickWorker()` function (lines 19-30) — it's defined but never called anywhere in the file.

**Step 3: Verify Vite build succeeds**

```bash
npm run build
```

Expected: Build succeeds with no errors. There may be warnings about the gifsicle WASM file — that's fine.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove gif.js worker and dead code from gifExporter"
```

---

### Task 5: Manual Testing — Download Tier

No automated test framework exists in this project. All verification is manual.

**Test 1: Basic animated GIF download**
1. Open the app in browser (dev server: `npm run dev`)
2. Load any meme template with a single panel
3. Add some text with animation (e.g., wave or bounce)
4. Click Download → Export as GIF
5. Check: GIF downloads successfully
6. Check: Open the GIF — animation plays, text is visible, colors look correct
7. Check: File size in file manager — should be under 8MB
8. Check: Browser console for `[Worker] Raw GIF size:` and `[Worker] Optimized GIF size:` logs — both should print

**Test 2: Multi-panel GIF**
1. Create a 2-panel or 4-panel meme
2. Add images to both panels
3. Add text + sticker with animation
4. Export as GIF
5. Check: All panels render correctly
6. Check: File size under 8MB

**Test 3: Deep-fried GIF**
1. Apply deep fry filter to a panel
2. Export as GIF
3. Check: Deep fry effect is visible in output
4. Check: File size reasonable

**Test 4: GIF with animated sticker**
1. Add an animated GIF sticker
2. Export as GIF
3. Check: Sticker animates in output

**Test 5: gifsicle fallback**
1. Open browser DevTools → Network → block requests to `.wasm` files
2. Export a GIF
3. Check: Console shows `[Worker] gifsicle optimization failed, using raw GIF`
4. Check: GIF still downloads and plays correctly (just larger)

---

### Task 6: Manual Testing — Share Tier

**Test 1: Share flow**
1. Load a meme with animation
2. Click Share (or the share button that triggers the share flow)
3. Check: GIF encodes (console logs show 480px dimensions)
4. Check: Upload to tmpfiles.org succeeds
5. Check: Link is copied to clipboard
6. Check: File size in console logs should be 1-3MB

**Test 2: Share vs Download comparison**
1. Export the same meme as both Download and Share
2. Compare: Share file should be noticeably smaller
3. Compare: Share quality will be lower (smaller resolution, more lossy) — this is expected

---

### Task 7: Clean Up Plan Files

After all manual tests pass:

```bash
rm docs/plans/2026-02-15-gif-export-optimization-design.md
rm docs/plans/2026-02-15-gif-export-optimization.md
```

Do NOT commit — these were never committed.
