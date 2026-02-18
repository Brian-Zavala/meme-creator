import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { Wand2, Type, ImageIcon, Zap, Pencil, Smile } from "lucide-react";
import ToolPill from "./ToolPill";
import SliderControl from "./SliderControl";
import ColorSwatchRow from "./ColorSwatchRow";
import PillSelector from "./PillSelector";
import { TEXT_ANIMATIONS } from "../../constants/textAnimations";
import { SHAPES } from "../../utils/shapeConstants.js";

const MemeStickerLibrary = lazy(() => import("../MemeEditor/MemeStickerLibrary"));
const AiToolRow      = lazy(() => import("./layers/AiToolRow"));
const TextToolRow    = lazy(() => import("./layers/TextToolRow"));
const ImageToolRow   = lazy(() => import("./layers/ImageToolRow"));
const DrawToolRow    = lazy(() => import("./layers/DrawToolRow"));
const StickerToolRow = lazy(() => import("./layers/StickerToolRow"));
const QuickToolRow   = lazy(() => import("./layers/QuickToolRow"));

const TABS = [
  { id: "ai",      label: "AI",      icon: Wand2 },
  { id: "text",    label: "Text",    icon: Type },
  { id: "image",   label: "Image",   icon: ImageIcon },
  { id: "quick",   label: "Quick",   icon: Zap },
  { id: "draw",    label: "Draw",    icon: Pencil },
  { id: "sticker", label: "Sticker", icon: Smile },
];

const FONTS = [
  { name: "Impact",          label: "Impact" },
  { name: "Anton",           label: "Block" },
  { name: "Archivo Black",   label: "Bold" },
  { name: "Oswald",          label: "Tall" },
  { name: "Montserrat",      label: "Modern" },
  { name: "Roboto",          label: "Clean" },
  { name: "Comic Neue",      label: "Comic" },
  { name: "Bangers",         label: "Loud" },
  { name: "Permanent Marker",label: "Marker" },
  { name: "Creepster",       label: "Scary" },
  { name: "Cinzel",          label: "Epic" },
  { name: "Pacifico",        label: "Script" },
  { name: "Bebas Neue",      label: "Bebas" },
  { name: "Luckiest Guy",    label: "Lucky" },
  { name: "Bungee",          label: "Arcade" },
  { name: "Lato",            label: "Slim" },
  { name: "Russo One",       label: "Russo" },
  { name: "Righteous",       label: "Retro" },
  { name: "Fredoka",         label: "Bubbly" },
  { name: "Rubik Mono One",  label: "Chunky" },
  { name: "Press Start 2P",  label: "Pixel" },
  { name: "Special Elite",   label: "Typer" },
  { name: "Black Ops One",   label: "Army" },
  { name: "Carter One",      label: "Carter" },
];

const IMAGE_FILTER_CONFIGS = {
  brightness: { min: 0, max: 200, step: 1,   defaultValue: 100, name: "brightness", label: "Bright" },
  contrast:   { min: 0, max: 200, step: 1,   defaultValue: 100, name: "contrast",   label: "Contrast" },
  blur:       { min: 0, max: 10,  step: 0.5, defaultValue: 0,   name: "blur",       label: "Blur" },
  hue:        { min: 0, max: 360, step: 1,   defaultValue: 0,   name: "hueRotate",  label: "Hue" },
  grayscale:  { min: 0, max: 100, step: 1,   defaultValue: 0,   name: "grayscale",  label: "Gray" },
  saturate:   { min: 0, max: 300, step: 1,   defaultValue: 100, name: "saturate",   label: "Saturate" },
  sepia:      { min: 0, max: 100, step: 1,   defaultValue: 0,   name: "sepia",      label: "Sepia" },
  invert:     { min: 0, max: 100, step: 1,   defaultValue: 0,   name: "invert",     label: "Invert" },
  deepfry:    { min: 0, max: 100, step: 1,   defaultValue: 0,   name: "deepFry",    label: "Deep Fry", filledColor: "#ef4444" },
};

const TEXT_SLIDER_CONFIGS = {
  size:    { min: 2,  max: 120, step: 1, defaultValue: 40,  name: "fontSize",      label: "Size" },
  width:   { min: 20, max: 100, step: 1, defaultValue: 100, name: "maxWidth",      label: "Width" },
  spacing: { min: -5, max: 50,  step: 1, defaultValue: 0,   name: "letterSpacing", label: "Spacing" },
};

function renderLayer2(activeTab, activeTool, meme, handlers) {
  const { handleStyleChange, handleFilterChange, handleStyleCommit, onAnimationChange, onAddSticker, closeLayer2, handleToolTap } = handlers;
  const filters = meme.filters || {};

  if (activeTab === "sticker" && activeTool) {
    const STICKER_PROPS = {
      search:    { initialTab: "tenor",  initialQuery: "",         focusSearch: true },
      trending:  { initialTab: "tenor",  initialQuery: "" },
      memes:     { initialTab: "tenor",  initialQuery: "meme" },
      animals:   { initialTab: "tenor",  initialQuery: "animals" },
      reactions: { initialTab: "tenor",  initialQuery: "reaction" },
    };
    const stickerProps = STICKER_PROPS[activeTool] || { initialTab: "tenor" };
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading...</div>}>
        <MemeStickerLibrary key={activeTool} {...stickerProps} onAddSticker={onAddSticker} onClose={closeLayer2} />
      </Suspense>
    );
  }

  if (activeTab === "image") {
    const cfg = IMAGE_FILTER_CONFIGS[activeTool];
    if (!cfg) return null; // crop triggers directly, no Layer 2

    return (
      <SliderControl
        {...cfg}
        value={filters[cfg.name] ?? cfg.defaultValue}
        onChange={handleFilterChange}
        onCommit={handleStyleCommit}
      />
    );
  }

  if (activeTab === "text") {
    const sliderCfg = TEXT_SLIDER_CONFIGS[activeTool];
    if (sliderCfg) {
      return (
        <SliderControl
          {...sliderCfg}
          value={meme[sliderCfg.name] ?? sliderCfg.defaultValue}
          onChange={handleStyleChange}
          onCommit={handleStyleCommit}
        />
      );
    }

    if (activeTool === "font") {
      return (
        <PillSelector
          items={FONTS}
          value={meme.fontFamily || "Roboto"}
          getId={(f) => f.name}
          getLabel={(f) => f.label}
          getStyle={(f) => ({ fontFamily: `${f.name}, sans-serif` })}
          onSelect={(f) =>
            handleStyleChange({ currentTarget: { name: "fontFamily", value: f.name } }, true)
          }
        />
      );
    }

    if (activeTool === "anim") {
      const activeAnimId =
        (meme.texts || []).find((t) => t.animation && t.animation !== "none")?.animation || "none";
      return (
        <PillSelector
          items={TEXT_ANIMATIONS}
          value={activeAnimId}
          getId={(a) => a.id}
          getLabel={(a) => a.name}
          onSelect={(a) => onAnimationChange && onAnimationChange(a.id)}
        />
      );
    }

    if (activeTool === "color") {
      return (
        <ColorSwatchRow name="textColor" value={meme.textColor} onChange={handleStyleChange} />
      );
    }

    if (activeTool === "bg") {
      return (
        <ColorSwatchRow
          name="textBgColor"
          value={meme.textBgColor}
          onChange={handleStyleChange}
          allowTransparent
        />
      );
    }

    if (activeTool === "shadow") {
      return (
        <ColorSwatchRow name="textShadow" value={meme.textShadow} onChange={handleStyleChange} />
      );
    }

    if (activeTool === "caption") {
      return (
        <div className="flex items-center gap-3 h-full px-3">
          <button
            type="button"
            onClick={() =>
              handleStyleChange(
                { currentTarget: { name: "paddingTop", value: (meme.paddingTop || 0) > 0 ? 0 : 15 } },
                true,
              )
            }
            className="tool-pill"
            data-active={(meme.paddingTop || 0) > 0 || undefined}
          >
            <span className="text-sm">▲</span>
            <span>Top Bar {(meme.paddingTop || 0) > 0 ? "On" : "Off"}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              handleStyleChange(
                { currentTarget: { name: "paddingBottom", value: (meme.paddingBottom || 0) > 0 ? 0 : 15 } },
                true,
              )
            }
            className="tool-pill"
            data-active={(meme.paddingBottom || 0) > 0 || undefined}
          >
            <span className="text-sm">▼</span>
            <span>Bottom Bar {(meme.paddingBottom || 0) > 0 ? "On" : "Off"}</span>
          </button>
        </div>
      );
    }
  }

  if (activeTab === "draw" && activeTool === "shape-menu") {
    return (
      <PillSelector
        items={SHAPES.slice(4)}
        value={null}
        getId={(s) => s.id}
        getLabel={(s) => s.label}
        onSelect={(s) => handleToolTap(`shape-${s.id}`)}
      />
    );
  }

  return null;
}

/** Light haptic tap — no-op if unsupported */
function haptic() {
  try { navigator.vibrate?.(8); } catch {}
}

const SWIPE_THRESHOLD = 30; // px vertical to trigger collapse

export default function MobileBottomBar({
  // Meme state (passed as { ...meme, filters: activePanel?.filters })
  meme,
  // Handlers
  handleStyleChange,
  handleFilterChange,
  handleStyleCommit,
  onAnimationChange,
  onStartCrop,
  isCropping,
  // AI tab
  onMagicCaption,
  isMagicGenerating,
  // Text tab
  onAddText,
  // Sticker tab
  onAddSticker,
  // Quick tab actions
  onChaos,
  onCaptionRemix,
  onStyleShuffle,
  onFilterFrenzy,
  onVibeCheck,
  onExtremeDeepFry,
  onStickerfy,
  onNuked,
  onGlitch,
  onCursed,
  onConfettiBlast,
  onTimeWarp,
  onRemoveAll,
  onRemoveEffects,
  // Draw tab
  canvasActiveTool,
  setCanvasActiveTool,
  onClearDrawings,
  // Collapse ref — Main writes a ref, we populate it with collapse()
  collapseRef,
}) {
  const [activeTab,  setActiveTab]  = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  // Mirror of activeTab for synchronous reads outside render (avoids setState-in-render)
  const activeTabRef = useRef(null);

  // --- Collapse all layers ---
  const collapseLayers = useCallback(() => {
    if (activeTabRef.current === "draw") setCanvasActiveTool("move");
    activeTabRef.current = null;
    setActiveTab(null);
    setActiveTool(null);
  }, [setCanvasActiveTool]);

  // Expose collapse function to parent via ref
  useEffect(() => {
    if (collapseRef) collapseRef.current = collapseLayers;
  }, [collapseRef, collapseLayers]);

  // --- Swipe-down dismiss (PointerEvent) ---
  const swipeStartY = useRef(null);

  const onSwipePointerDown = useCallback((e) => {
    swipeStartY.current = e.clientY;
  }, []);

  const onSwipePointerMove = useCallback((e) => {
    if (swipeStartY.current === null) return;
    const dy = e.clientY - swipeStartY.current;
    if (dy > SWIPE_THRESHOLD) {
      swipeStartY.current = null;
      haptic();
      collapseLayers();
    }
  }, [collapseLayers]);

  const onSwipePointerUp = useCallback(() => {
    swipeStartY.current = null;
  }, []);

  const swipeHandlers = {
    onPointerDown: onSwipePointerDown,
    onPointerMove: onSwipePointerMove,
    onPointerUp: onSwipePointerUp,
    onPointerCancel: onSwipePointerUp,
  };

  const handleTabTap = useCallback((tabId) => {
    haptic();
    const prevTab = activeTabRef.current;
    const newTab = prevTab === tabId ? null : tabId;

    // Canvas tool side-effects — called OUTSIDE any state updater
    if (newTab === "draw") {
      setCanvasActiveTool("pen");
    } else if (prevTab === "draw") {
      setCanvasActiveTool("move");
    }

    activeTabRef.current = newTab;
    setActiveTab(newTab);
    setActiveTool(null);
  }, [setCanvasActiveTool]);

  const handleToolTap = useCallback((toolId) => {
    haptic();
    // Crop activates immediately — no Layer 2
    if (toolId === "crop" && onStartCrop) {
      onStartCrop();
      setActiveTool(null);
      return;
    }
    // Draw tool pills control the canvas tool
    if (toolId === "pen" || toolId === "eraser") {
      setCanvasActiveTool(toolId);
    }
    // "More shapes" button opens Layer 2 picker — must be checked before startsWith('shape-')
    if (toolId === "shape-menu") {
      setActiveTool((prev) => (prev === "shape-menu" ? null : "shape-menu"));
      return;
    }
    // Shape tool pills control the canvas tool
    if (typeof toolId === "string" && toolId.startsWith("shape-")) {
      setCanvasActiveTool(toolId);
      return;
    }
    // Draw color dots change the draw color
    if (typeof toolId === "string" && toolId.startsWith("color-") && toolId !== "color-picker") {
      const color = toolId.replace("color-", "");
      handleStyleChange({ currentTarget: { name: "drawColor", value: color } }, true);
      return; // Don't toggle Layer 2
    }
    // Shape stroke color dots change the shape stroke color
    if (typeof toolId === "string" && toolId.startsWith("shapeStroke-")) {
      const color = toolId.replace("shapeStroke-", "");
      handleStyleChange({ currentTarget: { name: "shapeStroke", value: color } }, true);
      return;
    }
    setActiveTool((prev) => (prev === toolId ? null : toolId));
  }, [onStartCrop, setCanvasActiveTool, handleStyleChange]);

  const handlers = { handleStyleChange, handleFilterChange, handleStyleCommit, onAnimationChange, onAddSticker, closeLayer2: () => setActiveTool(null), handleToolTap };
  const toolRowProps = { activeTool, onToolTap: handleToolTap };

  const isStickerLayer2 = activeTab === "sticker" && activeTool;
  const layer2Content = meme && activeTab && activeTool
    ? renderLayer2(activeTab, activeTool, meme, handlers)
    : null;

  return (
    <div className="lg:hidden" data-html2canvas-ignore="true">
      {/* Layer 2: Active Control — expands above Layer 1 */}
      <div className="mobile-active-control" data-visible={layer2Content ? true : undefined} {...swipeHandlers}>
        <div className="mobile-active-control-inner">
          <div className={isStickerLayer2 ? "h-[50vh] max-h-[400px] overflow-y-auto" : "flex items-center h-[52px]"}>
            {layer2Content}
          </div>
        </div>
      </div>

      {/* Layer 1: Tool Row — slides up when a tab is active */}
      <div className="mobile-tool-row" data-visible={activeTab ? true : undefined} {...swipeHandlers}>
        <Suspense fallback={null}>
          {activeTab === "ai"      && <AiToolRow onMagicCaption={onMagicCaption} isMagicGenerating={isMagicGenerating} />}
          {activeTab === "text"    && <TextToolRow    {...toolRowProps} onAddText={onAddText} />}
          {activeTab === "image"   && <ImageToolRow   {...toolRowProps} />}
          {activeTab === "draw"    && (
            <DrawToolRow
              {...toolRowProps}
              canvasActiveTool={canvasActiveTool}
              drawColor={meme?.drawColor}
              onClearDrawings={onClearDrawings}
              shapeStroke={meme?.shapeStroke}
              shapeFill={meme?.shapeFill}
            />
          )}
          {activeTab === "sticker" && <StickerToolRow {...toolRowProps} />}
          {activeTab === "quick"   && (
            <QuickToolRow
              onChaos={onChaos}
              onCaptionRemix={onCaptionRemix}
              onStyleShuffle={onStyleShuffle}
              onFilterFrenzy={onFilterFrenzy}
              onVibeCheck={onVibeCheck}
              onExtremeDeepFry={onExtremeDeepFry}
              onStickerfy={onStickerfy}
              onNuked={onNuked}
              onGlitch={onGlitch}
              onCursed={onCursed}
              onConfettiBlast={onConfettiBlast}
              onTimeWarp={onTimeWarp}
              onRemoveAll={onRemoveAll}
              onRemoveEffects={onRemoveEffects}
            />
          )}
        </Suspense>
      </div>

      {/* Layer 0: Main Tab Bar */}
      <nav className="mobile-tab-bar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <ToolPill
            key={id}
            icon={<Icon className="w-4 h-4" />}
            label={label}
            isActive={activeTab === id}
            onClick={() => handleTabTap(id)}
            className="mobile-tab-pill"
          />
        ))}
      </nav>
    </div>
  );
}
