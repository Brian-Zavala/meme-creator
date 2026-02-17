# Mobile Style Controls - Implementation Plan

**Design doc:** `2026-02-16-mobile-style-controls-design.md`
**Branch:** `feature/mobile-samsung-style-editor`
**Approach:** Minimal refactor (Approach 1) — zero new dependencies

---

## Implementation Phases

### Phase 1: Foundation (Layer 0 - Tab Bar)

**Goal:** Fixed bottom tab bar visible on mobile/tablet with 5 tabs, canvas gets full height.

**Steps:**
1. Create `components/MobileEditor/MobileBottomBar.jsx` with Layer 0 tab bar
2. Create `components/MobileEditor/ToolPill.jsx` reusable pill component
3. Add mobile CSS to `index.css` (`.mobile-tab-bar`, `.tool-pill`, safe-area)
4. Modify `Main.jsx`: wrap current mobile toolbar/remix/sticker sections in `hidden lg:block`
5. Add `<MobileBottomBar>` in `Main.jsx` wrapped in `lg:hidden`
6. Add canvas bottom padding on mobile to avoid tab bar overlap
7. Verify desktop layout is completely unchanged

**Validation:** Tab bar shows on mobile, tapping tabs logs state changes, desktop sidebar untouched.

---

### Phase 2: Layer 1 - Tool Rows

**Goal:** Tapping a tab slides up the horizontal tool row for that mode.

**Steps:**
1. Create `components/MobileEditor/layers/TextToolRow.jsx` — font/size/color/width/anim/bg/shadow/caption pills
2. Create `components/MobileEditor/layers/ImageToolRow.jsx` — 9 filter pills + deep fry + crop
3. Create `components/MobileEditor/layers/DrawToolRow.jsx` — pen/eraser/clear + color dots
4. Create `components/MobileEditor/layers/StickerToolRow.jsx` — search + category pills
5. Create `components/MobileEditor/layers/QuickToolRow.jsx` — chaos/caption/style/remove pills
6. Add Layer 1 container in MobileBottomBar with slide animation
7. Implement tab toggle logic (tap to expand, tap again to collapse, tap different tab to swap)
8. Add CSS transitions for slide-up (translateY 250ms ease-out)

**Validation:** Each tab shows its tool row, horizontal scrolling works, swapping is smooth.

---

### Phase 3: Layer 2 - Active Controls

**Goal:** Tapping a tool pill reveals the specific control (slider, color row, font list) above Layer 1.

**Steps:**
1. Create `components/MobileEditor/SliderControl.jsx` — wraps OptimizedSlider for mobile
2. Create `components/MobileEditor/ColorSwatchRow.jsx` — horizontal color dots + picker
3. Create `components/MobileEditor/PillSelector.jsx` — horizontal scrolling pill selector
4. Wire TEXT tools: font→PillSelector, size→SliderControl, color→ColorSwatchRow, etc.
5. Wire IMAGE tools: all 9 filters→SliderControl, deep fry→SliderControl (red accent)
6. Wire DRAW tools: pen→popup (brush picker), eraser→SliderControl (width)
7. Wire STICKER: search input + sticker grid rendering
8. Wire QUICK: immediate-execute actions (chaos, caption remix, style shuffle)
9. Implement tool toggle/swap logic
10. Add CSS transitions for Layer 2 reveal (grid-template-rows 200ms)

**Validation:** Every tool in every tab produces correct Layer 2 control, values update meme state correctly.

---

### Phase 4: Top Bar

**Goal:** Floating top bar with Upload/Undo/Redo/Save/More replacing current scattered controls.

**Steps:**
1. Create `components/MobileEditor/MobileTopBar.jsx`
2. Implement ⋮ More dropdown menu (Share, Layout, Mode, Search, Remove All, Remove Effects)
3. Wire handlers: undo/redo from useHistory, upload from handleFileUpload, save from handleDownload
4. Hide current mobile ModeSelector, LayoutSelector, MemeActions, remixActionControls
5. Add dark overlay behind ⋮ menu when open
6. Style as semi-transparent floating bar

**Validation:** All top bar actions work, ⋮ menu opens/closes, layout/mode switching works.

---

### Phase 5: Gestures & Polish

**Goal:** Swipe-to-dismiss, dark overlay, haptic feedback, smooth transitions.

**Steps:**
1. Add PointerEvent swipe-down detection on bottom bar area
2. Implement dark overlay (bg-black/40) when Layer 1+ is visible, tap to dismiss
3. Add canvas tap handler to collapse all layers
4. Add haptic feedback (navigator.vibrate) on tab/tool taps
5. Ensure MemeFineTune floats above bottom bar correctly
6. Handle keyboard showing/hiding (mobile input focus adjustments)
7. Test with touch devices / Chrome DevTools mobile emulation
8. Add safe-area-inset-bottom for iPhone home indicator

**Validation:** Swipe dismiss works, overlay dismiss works, no z-index conflicts, iPhone safe areas correct.

---

### Phase 6: Search Integration

**Goal:** Image/GIF/Video search accessible from ⋮ menu as overlay.

**Steps:**
1. Create search overlay component (slides down from top or full-screen modal)
2. Reuse existing GifSearch and image search components inside overlay
3. Wire to existing search handlers (handleSearchInput, performSearch, etc.)
4. Add close button and "select image" handler that dismisses overlay
5. Ensure search works with both Images and Videos modes

**Validation:** Can search and select GIFs/images/videos from the overlay, results load into canvas.

---

### Phase 7: Edge Cases & Testing

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
9. Verify export still works correctly (bottom bar should have data-html2canvas-ignore)

**Validation:** No regressions, all features work on mobile and desktop.

---

## Dependency Graph

```
Phase 1 (Foundation)
    └── Phase 2 (Tool Rows)
        └── Phase 3 (Active Controls)
    └── Phase 4 (Top Bar)
Phase 2 + 3 + 4
    └── Phase 5 (Gestures & Polish)
        └── Phase 6 (Search Integration)
            └── Phase 7 (Edge Cases)
```

Phases 2-3 and Phase 4 can be developed in parallel.

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Desktop regression | All mobile code gated behind `lg:hidden` breakpoint |
| Z-index conflicts with modals | Bottom bar z-50, modals stay at z-[100+] |
| Touch event conflicts with canvas | Layers use stopPropagation, canvas tap only fires on canvas element |
| Performance on low-end phones | CSS transforms only (GPU composited), no JS animations |
| MemeFineTune overlap | Position with `bottom: calc(156px + env(safe-area-inset-bottom))` when layers open |
| Safe area (iPhone notch) | `env(safe-area-inset-bottom)` on tab bar |
| Export including bottom bar | `data-html2canvas-ignore="true"` on all mobile UI elements |
