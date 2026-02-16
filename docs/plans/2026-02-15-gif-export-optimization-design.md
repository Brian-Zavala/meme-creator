# GIF Export Optimization Design

> **Status:** Draft — do NOT commit. Remove after implementation is verified.

## Problem

Exported GIFs are 20-45MB. Industry benchmarks (Tenor median ~1MB, Giphy recommends <8MB) show we're 6-15x too large. This causes:
- Slow encoding (CPU-bound gif.js with 4 sub-workers)
- Slow uploads to tmpfiles.org for sharing
- Excessive download sizes for end users

## Goals

- **Download tier:** 3-8MB target, good visual quality
- **Share tier:** 1-3MB target, fast upload/link generation, acceptable quality loss
- Replace unmaintained gif.js (last updated 2016) with modern alternatives

## Approach

Replace gif.js with **gifenc** (encoding) + **gifsicle-wasm-browser** (post-processing optimization).

### Why This Combination

| Library | Role | Size | Key Advantage |
|---------|------|------|---------------|
| gifenc | Frame encoding (quantize → palette → indexed → GIF bytes) | 9KB gzip | Per-frame palettes, fast, modern, no sub-workers |
| gifsicle-wasm-browser | Post-processing (lossy compression, frame disposal optimization) | ~150KB gzip | Delta frame computation, lossy LZW, color reduction |

gif.js lacks: lossy compression, frame differencing, per-frame palettes, and is unmaintained.

## Architecture

### Pipeline

```
Canvas Frames (OffscreenCanvas, renderMemeFrame — unchanged)
    ↓
gifenc per frame:
    quantize(rgba, 256) → palette
    applyPalette(rgba, palette) → indexed pixels
    encoder.writeFrame(indexed, w, h, { palette, delay })
    ↓
encoder.finish() → Uint8Array (raw GIF, unoptimized)
    ↓
gifsicle-wasm-browser:
    run({ input: rawGifBytes, command: "-O2 --lossy=N [--colors=N]" })
    ↓
Optimized Blob → postMessage → main thread
```

### Two-Tier Configuration

| Setting | Download | Share |
|---------|----------|-------|
| Max dimension | 800px | 480px |
| Frame delay | Unchanged (current logic) | Unchanged |
| gifenc palette | 256 colors, per-frame | 256 colors, per-frame |
| gifsicle --lossy | 30 | 60 |
| gifsicle -O | -O2 | -O2 |
| gifsicle --colors | (none, keep 256) | 128 |
| Target file size | 3-8MB | 1-3MB |

The `action` parameter (already passed through `exportMemeAsGif`) determines tier selection.

### Resolution Clamping

```js
// Current
const MAX_GIF_DIMENSION = 1200;

// New
const MAX_GIF_DIMENSION = action === 'share' ? 480 : 800;
```

This is the single biggest size reduction lever. 1200px → 800px cuts raw pixel data by ~56%.

## Files Changed

### `services/exportWorker.js`
- Remove `import GIF from 'gif.js'`
- Add `import { GIFEncoder, quantize, applyPalette } from 'gifenc'`
- Add gifsicle-wasm-browser import
- Replace `exportGif()` internals:
  - Frame loop: use gifenc quantize/applyPalette/writeFrame instead of gif.addFrame
  - After loop: encoder.finish() → Uint8Array
  - Post-process: gifsicle-wasm-browser run() with tier-appropriate flags
  - Return optimized Blob
- Accept `action` in payload to determine tier
- Progress mapping: frames 30-70%, gifsicle optimization 70-95%, done 100%

### `services/gifExporter.js`
- Pass `action` through to worker payload (it's already a parameter, just not forwarded)
- No other changes needed

### `package.json`
- Remove: `gif.js`
- Add: `gifenc`, `gifsicle-wasm-browser`

### `/public/gif.worker.js`
- Delete (gif.js sub-worker script, no longer needed)

### Files NOT Changed
- `services/renderService.js` — frame rendering untouched
- `services/VideoFrameProvider.js` — video frame proxying untouched
- `components/Layout/Main.jsx` — export trigger logic untouched
- Frame timing/duration calculation — same logic, same 5s max

## Quality Considerations

gifenc has **no built-in dithering**. Mitigated by:
1. **Per-frame palettes** — each frame gets optimal 256 colors (vs gif.js global palette)
2. **Lossy compression noise** — gifsicle's lossy mode introduces controlled noise that masks banding
3. **Meme content characteristics** — high-contrast text/images rarely need smooth gradient dithering

Share tier (480px, lossy=60, 128 colors) will have visible quality reduction — acceptable for preview links.

## Risk Mitigation

- **gifsicle-wasm in worker:** Verify WASM loads correctly inside web worker context (importScripts or ESM)
- **Safari nested workers:** gif.js spawned sub-workers from a worker (fragile). gifenc removes this — simpler, more compatible
- **Memory:** 800px max is well within safe canvas limits (current 1200px already works)
- **Bundle size:** ~160KB new vs ~50KB removed — modest increase, offset by removing 4 sub-worker spawns

## Implementation Order

1. Install gifenc + gifsicle-wasm-browser, remove gif.js
2. Rewrite exportGif() in exportWorker.js to use gifenc
3. Add gifsicle-wasm post-processing step
4. Wire action parameter through to worker for tier selection
5. Delete /public/gif.worker.js
6. Test: export a multi-panel animated GIF, verify size < 8MB
7. Test: share flow, verify size < 3MB
8. Test: visual quality acceptable on both tiers
