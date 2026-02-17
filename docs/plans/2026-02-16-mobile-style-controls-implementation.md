# Mobile Style Controls - Implementation Plan

**Design doc:** `2026-02-16-mobile-style-controls-design.md`
**Branch:** `feature/mobile-samsung-style-editor`
**Approach:** Minimal refactor (Approach 1) — zero new dependencies

---

## Status Summary

| Phase | Status | Commits |
|-------|--------|---------|
| Phase 1: Foundation | ✅ Done | cdd3aa2 |
| Phase 2: Tool Rows | ✅ Done | cdd3aa2 |
| Phase 3: Active Controls | ✅ Done | 046d87c |
| Bug: Stickers not expanding | ✅ Fixed | 446f640 |
| Bug: Draw/erase not wired | ✅ Fixed | 4b7cec8 |
| Bug: Sticker categories identical | ✅ Fixed | c57a0d8 |
| Bug: Canvas dashed border z-index | ✅ Fixed | aa4ea62 |
| Phase 4: Top Bar | 🔲 Next | — |
| Phase 5: Gestures & Polish | 🔲 Pending | — |
| Phase 6: Search Integration | 🔲 Pending | — |
| Phase 7: Edge Cases & Testing | 🔲 Pending | — |

---

## Implementation Phases

### Phase 1: Foundation (Layer 0 - Tab Bar) ✅ DONE

**Goal:** Fixed bottom tab bar visible on mobile/tablet with 5 tabs, canvas gets full height.

**Completed:**
- Created `components/MobileEditor/ToolPill.jsx`
- Created `components/MobileEditor/MobileBottomBar.jsx` with Layer 0 tab bar
- Added `.mobile-tab-bar`, `.tool-pill`, `.mobile-tab-pill`, `.draw-color-dot`, `.mobile-canvas-pad` to `index.css`
- Modified `Main.jsx`: hid old mobile toolbar/remix/sticker sections behind `hidden`
- Added `<MobileBottomBar>` in `Main.jsx` inside `lg:hidden` wrapper
- Canvas gets bottom padding via `.mobile-canvas-pad` media query

---

### Phase 2: Layer 1 - Tool Rows ✅ DONE

**Goal:** Tapping a tab slides up the horizontal tool row for that mode.

**Completed:**
- Created `components/MobileEditor/layers/TextToolRow.jsx` — 9 tool pills
- Created `components/MobileEditor/layers/ImageToolRow.jsx` — 10 filter/crop pills
- Created `components/MobileEditor/layers/DrawToolRow.jsx` — pen/eraser/clear + color dots
- Created `components/MobileEditor/layers/StickerToolRow.jsx` — search + 5 category pills
- Created `components/MobileEditor/layers/QuickToolRow.jsx` — 5 immediate-action pills
- Added Layer 1 container `.mobile-tool-row` with `translateY` slide animation
- Tab toggle logic: tap to expand, tap same to collapse, tap different to swap

---

### Phase 3: Layer 2 - Active Controls ✅ DONE

**Goal:** Tapping a tool pill reveals the specific control (slider, color row, font list) above Layer 1.

**Completed:**
- Created `components/MobileEditor/SliderControl.jsx` — wraps OptimizedSlider with label + reset
- Created `components/MobileEditor/ColorSwatchRow.jsx` — 8 preset swatches + transparent + native picker
- Created `components/MobileEditor/PillSelector.jsx` — horizontal pill row for fonts/animations
- TEXT tools all wired: font→PillSelector, size/width/spacing→SliderControl, color/bg/shadow→ColorSwatchRow, anim→PillSelector, caption→toggle buttons
- IMAGE tools all wired: all 9 filters→SliderControl, deepfry→SliderControl (red accent), crop→direct action
- DRAW: pen/eraser pills set `canvasActiveTool` on Main.jsx, color dots call `handleStyleChange(drawColor)`, `canvasActiveTool` + `setCanvasActiveTool` props thread through
- STICKER: `MemeStickerLibrary` rendered as Layer 2 (50vh), height dynamic
- QUICK: all 5 buttons execute immediately, no Layer 2
- CSS: `.mobile-active-control` with `grid-template-rows: 0fr → 1fr` animation

**Key implementation notes:**
- `MobileBottomBar` has internal `activeTab`/`activeTool` state (UI layer state)
- `canvasActiveTool`/`setCanvasActiveTool` props are Main.jsx's `activeTool`/`setActiveTool` — needed for draw mode
- Sticker Layer 2 uses `key={activeTool}` on `MemeStickerLibrary` to force remount on category change
- `MemeStickerLibrary` now accepts `initialTab`, `initialQuery`, `scrollToCategory`, `focusSearch` props:
  - search → tenor tab, auto-focus search input
  - trending → tenor tab, trending GIFs
  - memes → tenor tab, pre-search "meme"
  - animals → emoji tab, scroll to "Animals" category
  - reactions → emoji tab, scroll to "Faces" category
- Mobile bar z-indices: tab-bar=110, tool-row=109, active-control=108 (above canvas overlays at z-100/101)

---

### Phase 4: Top Bar 🔲 NEXT

**Goal:** Floating top bar with Upload/Undo/Redo/Save/More replacing current scattered controls.

**Steps:**
1. Create `components/MobileEditor/MobileTopBar.jsx`
2. Implement ⋮ More dropdown menu (Share, Layout, Mode, Search, Remove All, Remove Effects)
3. Wire handlers: undo/redo from useHistory, upload from handleFileUpload, save from handleDownload
4. Hide current mobile ModeSelector, LayoutSelector, MemeActions, remixActionControls in Main.jsx
5. Add dark overlay behind ⋮ menu when open
6. Style as semi-transparent floating bar (48px height, fixed top)
7. Add top padding to canvas on mobile so content doesn't hide under top bar

**Prop requirements (from Main.jsx):**
- `onUndo` — from `handleUndo`
- `onRedo` — from `handleRedo`
- `canUndo` — from `history.past.length > 0`
- `canRedo` — from `history.future.length > 0`
- `onUpload` — opens file input (trigger `memeInputRef` or similar)
- `onDownload` — from `handleDownload`
- `onShare` — from `handleShare`
- `onRemoveAll` — from `handleReset`
- `onRemoveEffects` — from `handleRemoveEffects`
- `layout` / `onLayoutChange` — current layout value + setter
- `mode` / `onModeChange` — current mode value + setter (Images/Videos)

**Validation:** All top bar actions work, ⋮ menu opens/closes, layout/mode switching works.

---

### Phase 5: Gestures & Polish 🔲 PENDING

**Goal:** Swipe-to-dismiss, dark overlay, haptic feedback, smooth transitions.

**Steps:**
1. Add PointerEvent swipe-down detection on bottom bar area
2. Implement dark overlay (bg-black/40) when Layer 1+ is visible, tap to dismiss
3. Add canvas tap handler to collapse all layers
4. Add haptic feedback (navigator.vibrate) on tab/tool taps
5. Ensure MemeFineTune floats above bottom bar correctly (bottom: calc(156px + safe-area))
6. Handle keyboard showing/hiding (mobile input focus adjustments)
7. Add safe-area-inset-bottom for iPhone home indicator

**Validation:** Swipe dismiss works, overlay dismiss works, iPhone safe areas correct.

---

### Phase 6: Search Integration 🔲 PENDING

**Goal:** Image/GIF/Video search accessible from ⋮ menu as overlay.

**Steps:**
1. Create search overlay component (slides down from top or full-screen modal)
2. Reuse existing GifSearch and image search components inside overlay
3. Wire to existing search handlers (handleSearchInput, performSearch, etc.)
4. Add close button and "select image" handler that dismisses overlay
5. Ensure search works with both Images and Videos modes

**Validation:** Can search and select GIFs/images/videos from the overlay, results load into canvas.

---

### Phase 7: Edge Cases & Testing 🔲 PENDING

**Goal:** Handle all edge cases and ensure robustness.

**Steps:**
1. Test caption bars toggle within TEXT tab Layer 2
2. Test crop mode interaction with bottom bar (should hide bar during crop)
3. Test sticker drag after adding from STICKER tab
4. Test deep fry slider (async processing indicator)
5. Test with different screen sizes (iPhone SE, iPad, Galaxy S21, Pixel)
6. Test orientation changes (portrait → landscape)
7. Test with reduced motion preferences (prefers-reduced-motion)
8. Ensure all existing keyboard shortcuts still work (Ctrl+Z etc.)
9. Verify export still works correctly (bottom bar has data-html2canvas-ignore)

**Validation:** No regressions, all features work on mobile and desktop.

---

## Dependency Graph

```
Phase 1 (Foundation) ✅
    └── Phase 2 (Tool Rows) ✅
        └── Phase 3 (Active Controls) ✅
Phase 1 ✅
    └── Phase 4 (Top Bar) ← NEXT
Phase 2 + 3 + 4
    └── Phase 5 (Gestures & Polish)
        └── Phase 6 (Search Integration)
            └── Phase 7 (Edge Cases)
```

---

## Files Created (Phases 1-3)

| File | Purpose |
|---|---|
| `components/MobileEditor/MobileBottomBar.jsx` | 3-layer system orchestrator |
| `components/MobileEditor/ToolPill.jsx` | Reusable pill button |
| `components/MobileEditor/SliderControl.jsx` | Mobile slider wrapper |
| `components/MobileEditor/ColorSwatchRow.jsx` | Horizontal color picker |
| `components/MobileEditor/PillSelector.jsx` | Horizontal pill row |
| `components/MobileEditor/layers/TextToolRow.jsx` | TEXT tab Layer 1 |
| `components/MobileEditor/layers/ImageToolRow.jsx` | IMAGE tab Layer 1 |
| `components/MobileEditor/layers/DrawToolRow.jsx` | DRAW tab Layer 1 |
| `components/MobileEditor/layers/StickerToolRow.jsx` | STICKER tab Layer 1 |
| `components/MobileEditor/layers/QuickToolRow.jsx` | QUICK tab Layer 1 |

## Files Modified (Phases 1-3)

| File | Changes |
|---|---|
| `components/Layout/Main.jsx` | MobileBottomBar integrated, old mobile sections hidden |
| `components/MemeEditor/MemeStickerLibrary.jsx` | Added initialTab/initialQuery/scrollToCategory/focusSearch props |
| `index.css` | All mobile CSS: tab-bar, tool-row, active-control, tool-pill, draw-color-dot, mobile-canvas-pad |

---

## Risk Mitigation

| Risk | Status |
|---|---|
| Desktop regression | ✅ All mobile code gated behind `lg:hidden` |
| Z-index conflicts with canvas overlays | ✅ Fixed: bar at z-108/109/110 |
| Draw tools not working | ✅ Fixed: canvasActiveTool threaded from Main.jsx |
| Sticker categories identical | ✅ Fixed: per-category props + key remount |
| Touch event conflicts with canvas | Mitigated via stopPropagation in layers |
| MemeFineTune overlap | ⏳ To address in Phase 5 |
| Safe area (iPhone notch) | ✅ env(safe-area-inset-bottom) on tab bar |
| Export including bottom bar | ✅ data-html2canvas-ignore on MobileBottomBar wrapper |
