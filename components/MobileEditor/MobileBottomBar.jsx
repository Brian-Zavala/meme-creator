import { useState, useCallback, lazy, Suspense } from "react";
import { Type, ImageIcon, Pencil, Smile, Zap } from "lucide-react";
import ToolPill from "./ToolPill";
import SliderControl from "./SliderControl";
import ColorSwatchRow from "./ColorSwatchRow";
import PillSelector from "./PillSelector";
import { TEXT_ANIMATIONS } from "../../constants/textAnimations";

const MemeStickerLibrary = lazy(() => import("../MemeEditor/MemeStickerLibrary"));
const TextToolRow    = lazy(() => import("./layers/TextToolRow"));
const ImageToolRow   = lazy(() => import("./layers/ImageToolRow"));
const DrawToolRow    = lazy(() => import("./layers/DrawToolRow"));
const StickerToolRow = lazy(() => import("./layers/StickerToolRow"));
const QuickToolRow   = lazy(() => import("./layers/QuickToolRow"));

const TABS = [
  { id: "text",    label: "Text",    icon: Type },
  { id: "image",   label: "Image",   icon: ImageIcon },
  { id: "draw",    label: "Draw",    icon: Pencil },
  { id: "sticker", label: "Sticker", icon: Smile },
  { id: "quick",   label: "Quick",   icon: Zap },
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
  const { handleStyleChange, handleFilterChange, handleStyleCommit, onAnimationChange, onAddSticker } = handlers;
  const filters = meme.filters || {};

  if (activeTab === "sticker" && activeTool) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading...</div>}>
        <MemeStickerLibrary onAddSticker={onAddSticker} onClose={() => {}} />
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

  return null;
}

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
  // Sticker tab
  onAddSticker,
  // Quick tab actions
  onChaos,
  onCaptionRemix,
  onStyleShuffle,
  onRemoveAll,
  onRemoveEffects,
  // Draw tab
  canvasActiveTool,
  setCanvasActiveTool,
  onClearDrawings,
}) {
  const [activeTab,  setActiveTab]  = useState(null);
  const [activeTool, setActiveTool] = useState(null);

  const handleTabTap = useCallback((tabId) => {
    setActiveTab((prev) => {
      if (prev === tabId) {
        // Closing tab — reset canvas tool
        if (prev === "draw") setCanvasActiveTool("move");
        setActiveTool(null);
        return null;
      }
      // Opening draw tab → activate pen on canvas
      if (tabId === "draw") {
        setCanvasActiveTool("pen");
      } else if (prev === "draw") {
        // Leaving draw tab → back to move
        setCanvasActiveTool("move");
      }
      setActiveTool(null);
      return tabId;
    });
  }, [setCanvasActiveTool]);

  const handleToolTap = useCallback((toolId) => {
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
    // Draw color dots change the draw color
    if (typeof toolId === "string" && toolId.startsWith("color-") && toolId !== "color-picker") {
      const color = toolId.replace("color-", "");
      handleStyleChange({ currentTarget: { name: "drawColor", value: color } }, true);
      return; // Don't toggle Layer 2
    }
    setActiveTool((prev) => (prev === toolId ? null : toolId));
  }, [onStartCrop, setCanvasActiveTool, handleStyleChange]);

  const handlers = { handleStyleChange, handleFilterChange, handleStyleCommit, onAnimationChange, onAddSticker };
  const toolRowProps = { activeTool, onToolTap: handleToolTap };

  const isStickerLayer2 = activeTab === "sticker" && activeTool;
  const layer2Content = meme && activeTab && activeTool
    ? renderLayer2(activeTab, activeTool, meme, handlers)
    : null;

  return (
    <div className="lg:hidden" data-html2canvas-ignore="true">
      {/* Layer 2: Active Control — expands above Layer 1 */}
      <div className="mobile-active-control" data-visible={layer2Content ? true : undefined}>
        <div className="mobile-active-control-inner">
          <div className={isStickerLayer2 ? "h-[50vh] max-h-[400px] overflow-y-auto" : "flex items-center h-[52px]"}>
            {layer2Content}
          </div>
        </div>
      </div>

      {/* Layer 1: Tool Row — slides up when a tab is active */}
      <div className="mobile-tool-row" data-visible={activeTab ? true : undefined}>
        <Suspense fallback={null}>
          {activeTab === "text"    && <TextToolRow    {...toolRowProps} />}
          {activeTab === "image"   && <ImageToolRow   {...toolRowProps} />}
          {activeTab === "draw"    && (
            <DrawToolRow
              {...toolRowProps}
              canvasActiveTool={canvasActiveTool}
              drawColor={meme?.drawColor}
              onClearDrawings={onClearDrawings}
            />
          )}
          {activeTab === "sticker" && <StickerToolRow {...toolRowProps} />}
          {activeTab === "quick"   && (
            <QuickToolRow
              onChaos={onChaos}
              onCaptionRemix={onCaptionRemix}
              onStyleShuffle={onStyleShuffle}
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
