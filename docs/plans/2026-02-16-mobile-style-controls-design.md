# Mobile Style Controls - Samsung Galaxy Editor Design

**Date:** 2026-02-16
**Branch:** `feature/mobile-samsung-style-editor`
**Scope:** Mobile + Tablet (< 1024px / `lg:` breakpoint)
**Desktop:** Unchanged - keeps current right sidebar layout

---

## Overview

Migrate the desktop-style stacked toolbar (TEXT/IMAGE/DRAW tabs with vertically stacked controls) into a Samsung Galaxy-style 3-layer reveal system for mobile and tablet devices. The canvas becomes full-screen with a compact bottom toolbar that reveals controls one at a time via horizontal scrolling.

**Design principles:**
- Canvas-first: content is always dominant
- One control at a time: no stacking, no scrolling through multiple sections
- Horizontal over vertical: tool rows scroll sideways, not down
- Maximum ~156px of bottom UI at any time
- Zero new dependencies

---

## Research-Backed Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Mobile + Tablet (< 1024px) | Desktop keeps efficient sidebar |
| Interaction | Hybrid tap/swipe | Tap tabs to toggle, swipe down to dismiss |
| Canvas layout | Full-screen, overlay on expand | Maximum immersion |
| Tab organization | 5 tabs (TEXT, IMAGE, DRAW, STICKER, QUICK) | Matches Samsung Gallery's 5-tab pattern |
| Controls within tabs | 3-layer reveal (Samsung pattern) | One slider at a time, not stacked sections |
| Overlay | Dark overlay (bg-black/40) | Tap to dismiss, clear focus |
| Animation | CSS transitions | Zero dependencies, ~300ms ease-out |

**Apps studied:** Samsung Gallery, Instagram, TikTok, Snapseed, CapCut

---

## Architecture: 3-Layer Reveal System

### Layer 0: Main Tab Bar (always visible, ~56px)

```
┌─────────────────────────────────────────────┐
│  📝      🖼️      ✏️      😀      ⚡        │
│  Text   Image   Draw   Sticker  Quick       │
└─────────────────────────────────────────────┘
```

- Fixed at bottom of viewport (`fixed bottom-0`)
- Icons + horizontal labels (e.g., `[📝 Text]`)
- Active tab highlighted with brand color indicator
- Always visible, never collapses
- ~56px height

### Layer 1: Tool Row (appears on tab tap, ~48px)

Slides up from Layer 0 when a tab is tapped. Shows horizontal scrollable tool pills for that mode.

**TEXT tool row:**
```
[𝐴 Font] [↕ Size] [🎨 Color] [↔ Width] [Aa Spacing] [↩ Anim] [⬛ BG] [⬜ Shadow] [▤ Caption]
```

**IMAGE tool row:**
```
[☀️ Bright] [◐ Contrast] [≋ Blur] [🌡 Hue] [◑ Gray] [💧 Saturate] [⏱ Sepia] [↕ Invert] [🔥 Deep Fry] [✂️ Crop]
```

**DRAW tool row:**
```
[✏️ Pen] [⬜ Eraser] [🗑️ Clear]  +  ⚪ ⚫ 🔴 🔵 🟡 🟢 🟣 [+]
```
(Draw shows color dots inline with tools)

**STICKER tool row:**
```
[🔍 Search...] [Recent] [Trending] [Memes] [Animals] [Reactions]
```
(Tapping a category shows sticker grid as Layer 2)

**QUICK tool row:**
```
[🎲 Chaos] [✨ Caption Remix] [🎨 Style Shuffle] [🗑️ Remove All] [✨ Remove Effects]
```
(These execute immediately on tap - no Layer 2 needed)

### Layer 2: Active Control (appears on tool tap, ~52px)

Reveals above Layer 1 when a specific tool pill is tapped. Only ONE active control visible at a time.

**Control types by tool:**

| Layer 1 Tool | Layer 2 Control |
|---|---|
| 𝐴 Font | Horizontal scroll of font name pills: `[Impact][Bold][Block][Marker]...` |
| ↕ Size | Single slider: `min=2 max=120 value=40` |
| 🎨 Color | Color swatch row: `⚪ ⚫ 🔴 🔵 🟡 [+picker]` |
| ↔ Width | Single slider: `min=20 max=100 value=100` |
| Aa Spacing | Single slider: `min=-5 max=50 value=0` |
| ↩ Anim | Animation pills: `[None][Fade][Zoom][Slide][Bounce]...` |
| ⬛ BG | Color swatch row (text background) |
| ⬜ Shadow | Color swatch row (text shadow) |
| ▤ Caption | Toggle pills: `[Top Bar][Bottom Bar]` with color pickers |
| ☀️ Bright | Single slider: `min=0 max=200 value=100` |
| ◐ Contrast | Single slider: `min=0 max=200 value=100` |
| ≋ Blur | Single slider: `min=0 max=10 step=0.5 value=0` |
| 🌡 Hue | Single slider: `min=0 max=360 value=0` |
| ◑ Gray | Single slider: `min=0 max=100 value=0` |
| 💧 Saturate | Single slider: `min=0 max=300 value=100` |
| ⏱ Sepia | Single slider: `min=0 max=100 value=0` |
| ↕ Invert | Single slider: `min=0 max=100 value=0` |
| 🔥 Deep Fry | Single slider: `min=0 max=100 value=0` (red accent) |
| ✂️ Crop | Activates crop mode on canvas (no Layer 2) |
| ✏️ Pen | Popup: brush types + width slider (Samsung-style floating card) |
| ⬜ Eraser | Popup: width slider |
| 🔍 Sticker Search | Inline search input + sticker grid below |

---

## Interaction Model

### Tap Behavior

| User Action | Result |
|---|---|
| Tap Layer 0 tab | Layer 1 slides up for that tab. If already open, collapses. |
| Tap different Layer 0 tab | Layer 1 swaps to new tab. Layer 2 collapses. |
| Tap Layer 1 tool | Layer 2 reveals/swaps above Layer 1. |
| Tap same Layer 1 tool again | Layer 2 collapses (toggle). |
| Tap different Layer 1 tool | Layer 2 swaps instantly (no collapse animation). |
| Tap canvas | Layer 1 + Layer 2 both collapse. |
| Swipe down on Layer 1/2 | Layer 1 + Layer 2 both collapse. |

### Animation Specifications

- Layer 1 slide up: `transform: translateY(0)` with `transition: transform 250ms ease-out`
- Layer 2 reveal: `grid-template-rows: 0fr → 1fr` with `transition: 200ms ease-out`
- Layer 2 swap: Cross-fade `opacity` with `transition: 150ms ease`
- Dark overlay: `opacity: 0 → 0.4` with `transition: 200ms ease`

### Gesture Support

- Swipe down on bottom UI area: Collapse all layers
- Uses PointerEvent API (modern, passive-safe, no wheel listeners)
- Touch threshold: 30px vertical movement to trigger collapse
- No complex snap points (keep it simple)

---

## Top Bar Design

Replaces current ModeSelector / MemeActions / Undo-Redo on mobile:

```
┌─────────────────────────────────────────────┐
│  [Upload]    [↻] [↪]        [Save]    [⋮]  │
└─────────────────────────────────────────────┘
```

### Button Mapping

| Position | Button | Current Element | Action |
|----------|--------|----------------|--------|
| Left | Upload | MemeActions upload | Opens file picker |
| Center-left | ↻ Undo | remixActionControls | Undo state |
| Center-right | ↪ Redo | remixActionControls | Redo state |
| Right | Save | MemeActions download | Download meme |
| Far-right | ⋮ More | New | Opens dropdown menu |

### ⋮ More Menu (Dropdown)

```
┌──────────────────────┐
│ 🔗 Share             │
│ ─────────────────── │
│ 📐 Layout            │ → [Single][Grid][Side][4-Grid]
│ 🎬 Mode              │ → [Images][Videos]
│ ─────────────────── │
│ 🔍 Search Images     │ → Opens search overlay
│ ─────────────────── │
│ 🗑️ Remove All        │
│ ✨ Remove Effects    │
└──────────────────────┘
```

---

## Height Budget

| State | Height | Canvas Lost |
|-------|--------|-------------|
| Default (Layer 0 only) | 56px | Minimal |
| Tab selected (Layer 0 + 1) | 104px | ~13% on 812px screen |
| Tool active (Layer 0 + 1 + 2) | 156px | ~19% on 812px screen |
| Top bar | 48px | Always present |
| **Maximum total** | **204px** | **~25% of viewport** |

Samsung Gallery uses ~160px bottom + ~48px top = ~208px total. We're within range.

---

## Element Migration Map

### Elements Moving INTO Bottom Tabs

| Current Element | Current Location | New Location |
|---|---|---|
| MemeToolbar TEXT controls | Above canvas (lg:hidden) | 📝 TEXT tab (Layer 1 + 2) |
| MemeToolbar IMAGE controls | Above canvas (lg:hidden) | 🖼️ IMAGE tab (Layer 1 + 2) |
| MemeToolbar DRAW controls | Above canvas (lg:hidden) | ✏️ DRAW tab (Layer 1 + 2) |
| MemeStickerSection | Below canvas (lg:hidden) | 😀 STICKER tab |
| RemixCarousel | Below canvas (lg:hidden) | ⚡ QUICK tab |

### Elements Moving INTO Top Bar

| Current Element | Current Location | New Location |
|---|---|---|
| MemeActions (Upload) | Left column | Top bar left |
| MemeActions (Download) | Left column | Top bar "Save" |
| MemeActions (Share) | Left column | Top bar ⋮ menu |
| Undo/Redo buttons | Below canvas | Top bar center |
| Remove All / Remove Effects | Below canvas | ⚡ QUICK tab OR ⋮ menu |

### Elements Moving INTO ⋮ Menu

| Current Element | Current Location | New Location |
|---|---|---|
| ModeSelector | Above canvas | ⋮ menu → Mode |
| LayoutSelector | Above canvas | ⋮ menu → Layout |
| Search bars (GIF/Image) | Above canvas | ⋮ menu → Search (opens overlay) |

### Elements Unchanged

| Element | Notes |
|---|---|
| Canvas (MemeCanvas) | Same component, takes full viewport |
| MemeFineTune | Floats above bottom tabs when text selected |
| Desktop toolbar (lg:flex) | Completely unchanged |
| All modals | Unchanged |

---

## Component Architecture

### New Components

1. **`MobileBottomBar.jsx`** — The 3-layer system
   - Manages: activeTab, activeTool, isExpanded states
   - Renders: Layer 0 (tabs), Layer 1 (tool rows), Layer 2 (active controls)
   - Props: same as MemeToolbar (filters, handlers, etc.)
   - Only rendered on `<lg` screens

2. **`MobileTopBar.jsx`** — Top action bar
   - Manages: ⋮ menu open state
   - Renders: Upload, Undo, Redo, Save, More menu
   - Only rendered on `<lg` screens

3. **`ToolPill.jsx`** — Reusable pill button for Layer 1
   - Props: icon, label, isActive, onClick
   - Handles: haptic feedback (navigator.vibrate)

4. **`SliderControl.jsx`** — Reusable Layer 2 slider
   - Wraps existing OptimizedSlider with mobile-specific styling
   - Shows value label and optional reset button

5. **`ColorSwatchRow.jsx`** — Reusable Layer 2 color picker
   - Horizontal color dots + custom color picker [+]
   - Used by: text color, text bg, text shadow, draw color

6. **`PillSelector.jsx`** — Reusable Layer 2 horizontal pill row
   - Used by: font selector, animation selector, sticker categories

### Modified Components

1. **`Main.jsx`** — Conditional rendering
   - `<lg`: Hides current MemeToolbar, remixActionControls, remixCarousel, MemeStickerSection
   - `<lg`: Renders MobileBottomBar + MobileTopBar instead
   - Desktop layout completely unchanged

2. **`MemeToolbar.jsx`** — No changes needed
   - Stays as-is for desktop (lg:flex)
   - Not rendered on mobile anymore

3. **`index.css`** — New animations
   - Layer slide transitions
   - Tool pill active states
   - Dark overlay fade

### Component Tree (Mobile)

```
Main.jsx
├── MobileTopBar (fixed top, <lg only)
│   ├── Upload button
│   ├── Undo / Redo buttons
│   ├── Save button
│   └── MoreMenu dropdown
│       ├── Share
│       ├── Layout selector
│       ├── Mode selector
│       └── Search overlay trigger
│
├── Canvas Area (full viewport)
│   ├── MemeCanvas (unchanged)
│   └── MemeFineTune (floats above bottom bar)
│
├── Dark Overlay (bg-black/40, tap to dismiss)
│
└── MobileBottomBar (fixed bottom, <lg only)
    ├── Layer 2: ActiveControl
    │   ├── SliderControl (for size/filter sliders)
    │   ├── ColorSwatchRow (for color pickers)
    │   ├── PillSelector (for fonts/animations)
    │   └── StickerGrid (for sticker tab)
    │
    ├── Layer 1: ToolRow
    │   ├── TextToolRow
    │   ├── ImageToolRow
    │   ├── DrawToolRow
    │   ├── StickerToolRow
    │   └── QuickToolRow
    │
    └── Layer 0: TabBar
        ├── ToolPill (Text)
        ├── ToolPill (Image)
        ├── ToolPill (Draw)
        ├── ToolPill (Sticker)
        └── ToolPill (Quick)
```

---

## State Management

### New State (in MobileBottomBar)

```js
const [activeTab, setActiveTab] = useState(null);    // null | 'text' | 'image' | 'draw' | 'sticker' | 'quick'
const [activeTool, setActiveTool] = useState(null);   // null | 'font' | 'size' | 'color' | 'brightness' | etc.
```

### Interaction Logic

```js
function handleTabTap(tab) {
  if (activeTab === tab) {
    // Toggle: collapse
    setActiveTab(null);
    setActiveTool(null);
  } else {
    // Switch tab
    setActiveTab(tab);
    setActiveTool(null); // Reset active tool when switching tabs
  }
}

function handleToolTap(tool) {
  if (activeTool === tool) {
    // Toggle: collapse Layer 2
    setActiveTool(null);
  } else {
    // Switch tool (Layer 2 swaps)
    setActiveTool(tool);
  }
}

function handleCanvasTap() {
  setActiveTab(null);
  setActiveTool(null);
}
```

### Props Flow

```
Main.jsx state (meme, handlers) → MobileBottomBar → Layer1/Layer2 controls
                                                       ↓
                                                 handleStyleChange
                                                 handleFilterChange
                                                 handleStyleCommit
```

No new global state needed. All existing handlers (handleStyleChange, handleFilterChange, etc.) are reused as-is.

---

## CSS Specifications

### Layer 0 (Tab Bar)

```css
.mobile-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: #0f0f0f;
  border-top: 1px solid #2f3336;
  padding-bottom: env(safe-area-inset-bottom); /* iPhone notch */
}
```

### Layer 1 (Tool Row)

```css
.mobile-tool-row {
  position: fixed;
  bottom: 56px; /* sits above tab bar */
  left: 0;
  right: 0;
  height: 48px;
  z-index: 49;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  background: #0f0f0f;
  border-top: 1px solid #2f3336;
  transform: translateY(100%);
  transition: transform 250ms ease-out;
}

.mobile-tool-row[data-visible="true"] {
  transform: translateY(0);
}
```

### Layer 2 (Active Control)

```css
.mobile-active-control {
  position: fixed;
  bottom: 104px; /* above tab bar + tool row */
  left: 0;
  right: 0;
  z-index: 48;
  padding: 8px 16px;
  background: #0f0f0f;
  border-top: 1px solid #2f3336;
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 200ms ease-out;
}

.mobile-active-control[data-visible="true"] {
  grid-template-rows: 1fr;
}
```

### Tool Pills

```css
.tool-pill {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: #181818;
  border: 1px solid #2f3336;
  color: #94a3b8;
  transition: all 200ms;
  white-space: nowrap;
  touch-action: manipulation;
}

.tool-pill[data-active="true"] {
  background: var(--color-brand);
  border-color: var(--color-brand);
  color: #000;
}
```

### Safe Area (iPhone Notch/Home Indicator)

```css
.mobile-tab-bar {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Ensure canvas has padding to avoid bottom bar overlap */
.mobile-canvas-wrapper {
  padding-bottom: calc(56px + env(safe-area-inset-bottom));
}
```

---

## Breakpoint Strategy

```
< 1024px (below lg:)  →  Mobile/Tablet layout (new Samsung-style)
≥ 1024px (lg: and up)  →  Desktop layout (unchanged right sidebar)
```

### Tailwind Classes

```jsx
{/* Desktop: current sidebar */}
<div className="hidden lg:flex ...">
  <MemeToolbar ... />
</div>

{/* Mobile: new Samsung-style bottom bar */}
<div className="lg:hidden">
  <MobileTopBar ... />
  <MobileBottomBar ... />
</div>
```

---

## Search Bar Handling

The GIF/Image/Video search bars currently sit above the canvas. On mobile:

- **Default**: Hidden (not shown until requested)
- **Accessed via**: ⋮ menu → "Search Images" or Mode selector in ⋮ menu
- **Opens as**: Full-width overlay/modal that slides down from top
- **Includes**: Search input + results grid
- **Dismisses**: Tap X or select an image

This keeps the canvas clean and search accessible when needed.

---

## Files to Create

| File | Purpose |
|---|---|
| `components/MobileEditor/MobileBottomBar.jsx` | 3-layer bottom bar system |
| `components/MobileEditor/MobileTopBar.jsx` | Top action bar |
| `components/MobileEditor/ToolPill.jsx` | Reusable pill button |
| `components/MobileEditor/SliderControl.jsx` | Mobile slider wrapper |
| `components/MobileEditor/ColorSwatchRow.jsx` | Horizontal color picker |
| `components/MobileEditor/PillSelector.jsx` | Horizontal pill row |
| `components/MobileEditor/layers/TextToolRow.jsx` | TEXT tab Layer 1 |
| `components/MobileEditor/layers/ImageToolRow.jsx` | IMAGE tab Layer 1 |
| `components/MobileEditor/layers/DrawToolRow.jsx` | DRAW tab Layer 1 |
| `components/MobileEditor/layers/StickerToolRow.jsx` | STICKER tab Layer 1 |
| `components/MobileEditor/layers/QuickToolRow.jsx` | QUICK tab Layer 1 |

## Files to Modify

| File | Changes |
|---|---|
| `components/Layout/Main.jsx` | Conditional rendering: mobile vs desktop |
| `index.css` | New mobile animations, transitions, tool pill styles |

## Files Unchanged

| File | Notes |
|---|---|
| `components/MemeEditor/MemeToolbar.jsx` | Desktop only, no changes |
| `components/MemeEditor/ImageFiltersPanel.jsx` | Desktop only, no changes |
| `components/MemeEditor/DrawToolsPanel.jsx` | Desktop only, no changes |
| `components/MemeEditor/MemeCanvas.jsx` | Same component for both |
| `components/MemeEditor/MemeFineTune.jsx` | Floats above bottom bar |

---

## Migration Safety

- **Desktop is untouched**: All changes gated behind `lg:hidden` / `<lg` breakpoint
- **Same handlers**: MobileBottomBar uses identical props as MemeToolbar
- **Same state**: No new global state, just local UI state in bottom bar
- **Progressive**: Can ship mobile UI while desktop stays stable
- **Rollback**: Delete MobileEditor/ folder + revert Main.jsx conditional = full rollback
