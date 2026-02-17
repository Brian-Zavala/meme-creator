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
| Phase 4: Top Bar | ✅ Done | 011f4d4 |
| Bug: Layer 1/2 border-top clashes w/ canvas | ✅ Fixed | 51a09d0 |
| Phase 5: Gestures & Polish | ✅ Done | 10333d5 |
| Phase 6: Search Integration | ✅ Done | (pre-existing) |
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

### Phase 4: Top Bar ✅ DONE

**Goal:** Floating top bar with Upload/Undo/Redo/Save/More replacing current scattered controls.

**Completed:**
- Created `components/MobileEditor/MobileTopBar.jsx` — fixed 48px bar, blur backdrop, z-110
- ⋮ More dropdown: Share, Layout (expandable pills), Mode (expandable pills), Instructions, Donate, Remove All, Remove Effects
- "MEME CREATOR" title inside ⋮ menu header (keeps bar uncluttered)
- Dark overlay behind menu when open (tap-to-dismiss)
- `Header.jsx` hidden on mobile (`hidden lg:flex`) — no overlap conflict
- `App.jsx` → `Main.jsx` → `MobileTopBar` prop thread for `onOpenInstructions`
- `Main.jsx` accepts `onOpenInstructions` prop, passes to MobileTopBar
- `mobile-canvas-pad` updated: `padding-top: calc(48px + env(safe-area-inset-top))`
- CSS added: `.mobile-top-bar`, `.mobile-top-btn`, `.mobile-top-btn-primary`, `.mobile-top-bar-overlay`, `.mobile-more-menu`, `.mobile-more-item`, `.mobile-more-sub`, `.mobile-more-sub-item`, `.mobile-more-app-title`
- Reduced motion rules added for overlay + menu animations

**Key implementation notes:**
- Upload uses internal `<input type="file" ref>` in MobileTopBar — calls `handleFileUpload` directly (same event shape as MemeActions)
- Mode change inline in Main.jsx JSX (replicates desktop ModeSelector logic, uses `startTransition` + `videoSource` preference)
- `data-html2canvas-ignore="true"` on bar, overlay, and menu

**Files created/modified:**
- `components/MobileEditor/MobileTopBar.jsx` ← NEW
- `components/Layout/Header.jsx` — added `hidden lg:flex`
- `components/Layout/Main.jsx` — lazy import, `onOpenInstructions` prop, MobileTopBar render
- `App.jsx` — passes `onOpenInstructions` to `<Main>`
- `index.css` — all mobile top bar CSS + updated mobile-canvas-pad

---

### Phase 5: Gestures & Polish ✅ DONE

**Goal:** Swipe-to-dismiss, haptic feedback, canvas collapse, safe areas.

**Commits:** 51a09d0 (border fix), 10333d5 (Phase 5)

**Completed:**
1. ✅ PointerEvent swipe-down on Layer 1 & Layer 2 (30px threshold → collapse)
2. ⏭️ Dark overlay — **intentionally skipped**: would block real-time canvas editing visibility
3. ✅ Canvas tap collapses all layers via `mobileCollapseRef` callback
4. ✅ Haptic feedback `navigator.vibrate(8)` on tab taps, tool taps, and swipe dismiss
5. ✅ MemeFineTune `position: fixed` above bottom bar: `bottom: calc(56px + env(safe-area-inset-bottom))`
6. ⏭️ Keyboard show/hide — deferred (resize events already handled by existing canvas logic)
7. ✅ Safe-area-inset-bottom on tab bar height, tool row bottom, active control bottom

**Key implementation notes:**
- `collapseLayers` exposed to Main.jsx via `collapseRef` prop (ref pattern, avoids lifting state)
- Tab bar uses `height: calc(56px + env(safe-area-inset-bottom))` + `align-items: flex-start` + `padding-top: 4px` to keep icons above the notch
- Layer 1 border-top was always visible (even when off-screen) — fixed to only show when `[data-visible]`
- `haptic()` helper is a try/catch no-op on unsupported devices

**Files modified:**
- `components/MobileEditor/MobileBottomBar.jsx` — swipe handlers, haptic, collapseRef, collapseLayers
- `components/Layout/Main.jsx` — mobileCollapseRef, canvas tap wiring, collapseRef prop
- `index.css` — safe-area height fixes, MemeFineTune mobile positioning, border-top visibility fix

**Validation:** Swipe dismiss works, canvas tap collapses, haptic fires, iPhone safe areas correct.

---

### Phase 6: Search Integration ✅ DONE (pre-existing)

**Goal:** Image/GIF/Video search accessible on mobile.

**Status:** Already satisfied — Meme/Unsplash/Pexels search tabs + search bar are visible at the top of the mobile canvas view. No overlay needed; the existing layout already exposes search on mobile.

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
    └── Phase 4 (Top Bar) ✅
Phase 2 + 3 + 4 ✅
    └── Phase 5 (Gestures & Polish) ✅
        └── Phase 6 (Search Integration) ✅
            └── Phase 7 (Edge Cases) ← NEXT
```

---

## Files Created (Phases 1-5)

| File | Purpose |
|---|---|
| `components/MobileEditor/MobileTopBar.jsx` | Fixed top bar: Upload/Undo/Redo/Save/⋮ menu |
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

## Files Modified (Phases 1-5)

| File | Changes |
|---|---|
| `components/Layout/Main.jsx` | MobileTopBar + MobileBottomBar integrated, old mobile sections hidden, `onOpenInstructions` prop, `mobileCollapseRef`, canvas tap collapse |
| `components/Layout/Header.jsx` | `hidden lg:flex` — invisible on mobile |
| `App.jsx` | Passes `onOpenInstructions` to `<Main>` |
| `components/MemeEditor/MemeStickerLibrary.jsx` | Added initialTab/initialQuery/scrollToCategory/focusSearch props |
| `components/MobileEditor/MobileBottomBar.jsx` | swipe-down dismiss, haptic feedback, `collapseRef` exposure, `collapseLayers` |
| `index.css` | All mobile CSS: top-bar, tab-bar, tool-row, active-control, tool-pill, draw-color-dot, mobile-canvas-pad, safe-area fixes, MemeFineTune positioning, border-top visibility |

---

## Risk Mitigation

| Risk | Status |
|---|---|
| Desktop regression | ✅ All mobile code gated behind `lg:hidden` |
| Z-index conflicts with canvas overlays | ✅ Fixed: bar at z-108/109/110 |
| Draw tools not working | ✅ Fixed: canvasActiveTool threaded from Main.jsx |
| Sticker categories identical | ✅ Fixed: per-category props + key remount |
| Touch event conflicts with canvas | Mitigated via stopPropagation in layers |
| MemeFineTune overlap | ✅ Fixed in Phase 5: fixed above bar via CSS |
| Safe area (iPhone notch) | ✅ Tab bar height calc, tool row + active control offsets |
| Export including bottom bar | ✅ data-html2canvas-ignore on MobileBottomBar wrapper |
