# Sticker GIF Flash Fix - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate the one-frame transparency flash that occurs when animated GIPHY stickers loop during GIF export.

**Architecture:** Replace the stateful sequential-decode GIF processor (`createGifProcessor`) with a pre-rendered frame cache (`createCachedGifProcessor`) for sticker GIFs only. All frames are decoded once at load time into an array of canvases, making `renderFrame()` a simple array lookup with zero mutable state. Background panel GIFs continue using the existing sequential processor.

**Tech Stack:** `omggif` (GifReader), OffscreenCanvas/HTMLCanvasElement, existing `createGenericCanvas` helper.

---

### Task 1: Fix duplicate variable declarations in createGifProcessor

**Files:**
- Modify: `services/renderService.js:64-69`

**Step 1: Remove duplicate declarations**

Lines 64-69 currently read:

```js
        let previousInfo = null;
        let savedState = null; // For disposal = 3
        let currentFrameIndex = -1;

        let savedState = null; // For disposal = 3
        let currentFrameIndex = -1;
```

Replace with:

```js
        let previousInfo = null;
        let savedState = null; // For disposal = 3
        let currentFrameIndex = -1;
```

This removes the duplicate `let savedState` and `let currentFrameIndex` that were introduced in a bad merge. These duplicates shadow the originals and could cause subtle bugs.

**Step 2: Verify the app still builds**

Run: `cd /home/baz/workspace/github.com/Brian-Zavala/meme-creator && npx vite build 2>&1 | tail -5`
Expected: Build succeeds (or at least no new errors from this file)

**Step 3: Commit**

```bash
git add services/renderService.js
git commit --no-gpg-sign -m "Fix duplicate variable declarations in createGifProcessor"
```

---

### Task 2: Implement createCachedGifProcessor

**Files:**
- Modify: `services/renderService.js` (add new function after `createGifProcessor`, before `createVideoProcessor` at line 188)

**Step 1: Add createCachedGifProcessor function**

Insert this function at line 187 (after the closing `}` of `createGifProcessor` and before the blank line + `createVideoProcessor`):

```js
/**
 * Pre-renders ALL frames of a GIF into cached canvases.
 * Used for sticker GIFs to eliminate the flash/flicker that occurs when
 * the stateful sequential decoder resets on loop restart.
 *
 * Returns the same API as createGifProcessor, but renderFrame() is a
 * simple array lookup with zero mutable state.
 */
export async function createCachedGifProcessor(url) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const reader = new GifReader(uint8Array);

        const width = reader.width;
        const height = reader.height;
        const numFrames = reader.numFrames();

        // GUARD: Fall back to sequential processor for pathologically large GIFs
        if (numFrames > 200) {
            console.warn(`[CachedGifProcessor] GIF has ${numFrames} frames (>200), falling back to sequential processor`);
            return null;
        }

        // Pre-calculate frame timing
        const frameDelays = [];
        let totalDuration = 0;
        const cumulativeDelays = [0];

        for (let i = 0; i < numFrames; i++) {
            const info = reader.frameInfo(i);
            const delay = (info.delay || 10) * 10;
            frameDelays.push(delay);
            totalDuration += delay;
            cumulativeDelays.push(totalDuration);
        }

        // === PRE-RENDER ALL FRAMES ===
        // Decode sequentially (respecting disposal modes) and snapshot each composited frame
        const compositeCanvas = createGenericCanvas(width, height);
        const compositeCtx = compositeCanvas.getContext('2d', { willReadFrequently: true });
        const tempCanvas = createGenericCanvas(width, height);
        const tempCtx = tempCanvas.getContext('2d');
        const rawFrameData = new Uint8ClampedArray(width * height * 4);

        const frameCache = [];
        let previousInfo = null;
        let savedState = null;

        for (let i = 0; i < numFrames; i++) {
            const info = reader.frameInfo(i);

            // Apply disposal from PREVIOUS frame
            if (i > 0 && previousInfo) {
                const { disposal, x, y, width: fW, height: fH } = previousInfo;
                if (disposal === 2) {
                    compositeCtx.clearRect(x, y, fW, fH);
                } else if (disposal === 3) {
                    if (savedState) {
                        compositeCtx.putImageData(savedState, 0, 0);
                    } else {
                        compositeCtx.clearRect(0, 0, width, height);
                    }
                }
                // disposal 0 or 1: do nothing (keep previous frame)
            }

            // Save state BEFORE drawing (for disposal mode 3)
            if (info.disposal === 3) {
                savedState = compositeCtx.getImageData(0, 0, width, height);
            }

            // Decode and draw this frame
            rawFrameData.fill(0);
            reader.decodeAndBlitFrameRGBA(i, rawFrameData);
            const imageData = new ImageData(new Uint8ClampedArray(rawFrameData), width, height);
            tempCtx.putImageData(imageData, 0, 0);
            compositeCtx.drawImage(tempCanvas, 0, 0);

            previousInfo = info;

            // Snapshot the composited result into a cached canvas
            const cachedCanvas = createGenericCanvas(width, height);
            const cachedCtx = cachedCanvas.getContext('2d');
            cachedCtx.drawImage(compositeCanvas, 0, 0);
            frameCache.push(cachedCanvas);
        }

        // Release decoder resources (temp canvases eligible for GC)
        // compositeCanvas, tempCanvas, rawFrameData are no longer needed

        return {
            width,
            height,
            numFrames,
            getDuration: () => totalDuration,

            getFrameAtTime: (timeMs) => {
                if (numFrames <= 0) return 0;
                if (timeMs < 0) timeMs = 0;
                const t = totalDuration > 0 ? timeMs % totalDuration : 0;
                for (let i = 0; i < numFrames; i++) {
                    if (t < cumulativeDelays[i + 1]) return i;
                }
                return numFrames - 1;
            },

            getDelay: (frameIndex = 0) => reader.frameInfo(Math.min(frameIndex, numFrames - 1)).delay,

            getAllDelays: () => {
                const delays = [];
                for (let i = 0; i < numFrames; i++) {
                    delays.push(reader.frameInfo(i).delay);
                }
                return delays;
            },

            renderFrame: (frameIndex) => {
                // Simple array lookup - no state, no disposal, no flicker
                const clampedIndex = Math.max(0, Math.min(frameIndex, numFrames - 1));
                return { canvas: frameCache[clampedIndex], delay: frameDelays[clampedIndex] };
            }
        };
    } catch (e) {
        console.error("Failed to create cached GIF processor:", url, e);
        return null;
    }
}
```

**Step 2: Verify the app builds**

Run: `cd /home/baz/workspace/github.com/Brian-Zavala/meme-creator && npx vite build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add services/renderService.js
git commit --no-gpg-sign -m "Add createCachedGifProcessor for flicker-free sticker GIF rendering"
```

---

### Task 3: Wire up loadMemeAssets to use createCachedGifProcessor for stickers

**Files:**
- Modify: `services/renderService.js:573-588` (the sticker loading block in `loadMemeAssets`)

**Step 1: Replace createGifProcessor with createCachedGifProcessor for stickers**

The current sticker loading block (lines 573-588) is:

```js
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
            const img = await loadGenericImage(getLoadableUrl(s), s);
            if (img) stickerImages[s.id] = img;
        }
    }));
```

Replace with:

```js
    await Promise.all((stickers || []).filter(s => s.type === 'image' || s.type === 'giphy' || s.type === 'tenor').map(async (s) => {
        let processor = null;
        if (s.isAnimated || s.url.includes('.gif')) {
            // Use cached processor for stickers (pre-renders all frames, eliminates loop flicker)
            // Falls back to sequential processor if >200 frames (returns null)
            processor = await createCachedGifProcessor(s.url);
            // Fallback chain: cachedProcessor → sequential processor → static image
            if (!processor) {
                processor = await createGifProcessor(s.url);
            }
            // Fallback: try sourceBlob if both failed
            if (!processor && s.sourceBlob instanceof Blob) {
                const freshUrl = URL.createObjectURL(s.sourceBlob);
                processor = await createCachedGifProcessor(freshUrl);
                if (!processor) {
                    processor = await createGifProcessor(freshUrl);
                }
            }
            if (processor) stickerProcessors[s.id] = processor;
        }

        if (!processor) {
            const img = await loadGenericImage(getLoadableUrl(s), s);
            if (img) stickerImages[s.id] = img;
        }
    }));
```

The fallback chain is: `createCachedGifProcessor` → `createGifProcessor` → `sourceBlob retry` → `static image`. This ensures the >200 frame guard and any decode errors gracefully degrade.

**Step 2: Verify the app builds**

Run: `cd /home/baz/workspace/github.com/Brian-Zavala/meme-creator && npx vite build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add services/renderService.js
git commit --no-gpg-sign -m "Wire sticker loading to use cached GIF processor with fallback chain"
```

---

### Task 4: Manual verification

**Step 1: Start dev server**

Run: `cd /home/baz/workspace/github.com/Brian-Zavala/meme-creator && npx vite dev`

**Step 2: Test the fix**

1. Open the app in browser
2. Select any static meme template
3. Add an animated GIPHY sticker (search for any popular sticker)
4. Export as GIF
5. Open the exported GIF and watch the loop boundary — the sticker should NOT flash/disappear

**Step 3: Test edge cases**

1. Add 2+ animated stickers with different loop durations → both should loop smoothly
2. Use an animated GIF background + animated sticker → background uses old processor, sticker uses cached, both should work
3. Add a static image sticker alongside an animated one → static should be unaffected

**Step 4: Commit final state (if any adjustments needed)**

```bash
git add services/renderService.js
git commit --no-gpg-sign -m "Fix animated sticker flash on GIF export loop restart

Replace stateful sequential GIF decoder with pre-rendered frame cache
for sticker GIFs. All frames decoded once at load time, renderFrame()
is a simple array lookup with zero mutable state."
```
