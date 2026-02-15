# Fix: Animated Sticker Flash on GIF Export Loop Restart

## Problem

Animated GIPHY stickers disappear for one frame when their animation loop restarts during GIF export. Background GIF panels are unaffected. The bug affects all animated stickers.

## Root Cause

`createGifProcessor` in `renderService.js` uses a stateful sequential decoder with a shared internal canvas. On loop restart (line 125: `frameIndex < currentFrameIndex`), it clears the canvas and resets decoder state before re-rendering frame 0. The export captures this cleared canvas as a blank frame.

Additionally, lines 64-69 contain duplicate `let savedState` / `let currentFrameIndex` declarations from a broken merge that removed the Frame 0 caching fix.

Background GIFs don't flash because their loop duration typically drives the export timing, so their restart aligns with the export boundary.

## Solution: Pre-rendered Frame Cache

### New function: `createCachedGifProcessor(url)`

Replace the stateful sequential-decode approach with a pre-rendered frame cache for sticker GIFs.

**Load time (one-time cost):**
1. Fetch and parse GIF with `omggif`
2. Pre-compute frame timing arrays (`frameDelays`, `cumulativeDelays`, `totalDuration`)
3. Sequentially decode ALL frames (0 through N), applying disposal modes correctly
4. Store each fully-composited frame as a separate canvas in `frameCache[]`
5. Release the decoder resources (temp canvas, raw frame buffer)

**Render time (per export frame):**
- `renderFrame(frameIndex)` returns `{ canvas: frameCache[frameIndex], delay: frameDelays[frameIndex] }`
- Zero mutable state. No `currentFrameIndex`, `savedState`, `previousInfo`.

### API Surface (unchanged)

```
{ width, height, numFrames, getDuration, getFrameAtTime, getDelay, getAllDelays, renderFrame }
```

Callers (export render loop) need zero changes.

### Integration

- `loadMemeAssets()` uses `createCachedGifProcessor()` for stickers
- Background panel GIFs continue using `createGifProcessor()` (larger images benefit from sequential decode)

### Guards

- If sticker GIF has >200 frames, fall back to sequential processor (prevents pathological memory use)
- If decode fails, fall back to static image (same as current null-return behavior)

### Cleanup

- Fix duplicate variable declarations on lines 64-69 of `renderService.js`

## Memory Impact

Typical GIPHY sticker: ~30 frames at 200x200px = ~4.6MB per sticker (200*200*4*30 bytes). Acceptable for the typical 1-3 stickers per meme.

## Verification

1. Export GIF with animated GIPHY sticker, inspect frame-by-frame at loop boundary for transparency gaps
2. Test stickers with different GIF disposal modes
3. Test multiple animated stickers on same panel
4. Verify background animated GIF panels still work correctly
