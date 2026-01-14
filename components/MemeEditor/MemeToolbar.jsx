import { useState, lazy, Suspense, useTransition, useEffect, useRef } from "react";
import {
  Type,
  MoveHorizontal,
  ArrowLeftRight,
  Image as ImageIcon,
  Sun,
  Contrast,
  CloudFog as Blur,
  Smile,
  SunDim as Grayscale,
  Timer as Sepia,
  Aperture as HueRotate,
  Droplet as Saturate,
  FlipVertical as Invert,
  RefreshCcw,
  PanelTop,
  PanelBottom,
  Pencil,
  Eraser,
  Trash2,
  Flame,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { TEXT_ANIMATIONS } from "../../constants/textAnimations";
import OptimizedSlider from "../ui/OptimizedSlider";
import MemeInputs from "./MemeInputs";

const ColorControls = lazy(() => import("./ColorControls"));

const FONTS = [
  { name: "Impact", label: "Impact" },
  { name: "Anton", label: "Block" },
  { name: "Archivo Black", label: "Bold" },
  { name: "Oswald", label: "Tall" },
  { name: "Montserrat", label: "Modern" },
  { name: "Roboto", label: "Clean" },
  { name: "Comic Neue", label: "Comic" },
  { name: "Bangers", label: "Loud" },
  { name: "Permanent Marker", label: "Marker" },
  { name: "Creepster", label: "Scary" },
  { name: "Cinzel", label: "Epic" },
  { name: "Pacifico", label: "Script" },
];

function AnimationButton({ anim, isActive, onClick, variant = 'text' }) {
  const [isHovered, setIsHovered] = useState(false);
  // Animate on hover/focus, but only if not 'none'
  const shouldAnimate = isHovered && anim.id !== 'none';

  // Base classes for active state depend on variant
  const activeClasses = variant === 'sticker'
    ? "bg-blue-500/20 text-blue-400 border-blue-500 font-bold shadow-[0_0_10px_rgba(59,130,246,0.3)]"
    : "bg-brand/20 text-brand border-brand font-bold shadow-[0_0_10px_rgba(255,199,0,0.3)]";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      role="radio"
      aria-checked={isActive}
      className={`snap-center shrink-0 px-3 py-2 rounded-lg border text-sm transition-all active:scale-95 flex items-center gap-2 group ${isActive
        ? activeClasses
        : anim.id === 'none'
          ? "bg-slate-900 text-slate-500 border-slate-700 hover:border-slate-500 hover:text-white"
          : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
        }`}
      style={{ touchAction: 'manipulation' }}
    >
      {anim.icon.includes('/') || anim.icon.includes('.') ? (
        <img
          src={anim.icon}
          alt={anim.name}
          className={`w-6 h-6 object-contain ${shouldAnimate ? `animate-icon-${anim.id}` : ''}`}
        />
      ) : (
        <span className={`text-base ${shouldAnimate ? `animate-icon-${anim.id}` : ''}`}>
          {anim.icon}
        </span>
      )}
      <span className="text-xs uppercase font-bold tracking-wide">{anim.name}</span>
    </button>
  );
}

export default function MemeToolbar({ meme, activeTool, setActiveTool, handleStyleChange, handleFilterChange, handleStyleCommit, onResetFilters, onClearDrawings, onDrawerExpand, onAnimationChange, onStickerAnimationChange, editingId,
  // New props for MemeInputs
  handleTextChange, onAddSticker, onMagicCaption, isMagicGenerating, onChaos, onExportStickers, onEditingChange,
  className = ""
}) {
  const [activeTab, setActiveTab] = useState("text");
  const [isPending, startTransition] = useTransition();
  const [showSliders, setShowSliders] = useState(false); // Collapsed by default on mobile
  const [showTextStyling, setShowTextStyling] = useState(false); // Collapsed by default
  // Track if drawer has been opened after text was added - stays true until all text removed
  const [drawerHasOpened, setDrawerHasOpened] = useState(false);
  const hasStickers = meme.stickers && meme.stickers.length > 0;
  const hasText = meme.texts.some(t => (t.content || "").trim().length > 0);
  const hasAnimatedText = meme.texts.some(t => t.animation && t.animation !== 'none');
  const hasAnimatedSticker = meme.stickers.some(s => s.animation && s.animation !== 'none');

  // Auto-expand on desktop

  const handleTabChange = (tab) => {
    startTransition(() => {
      setActiveTab(tab);
      if (tab === 'draw') {
        setActiveTool('pen');
      } else {
        setActiveTool('move');
      }
    });
  };

  // Keep drawer collapsed while user is actively editing ANY text on canvas
  // The drawer should only expand when user clicks away (which clears editingId)
  const isActivelyEditing = !!editingId;

  // Reset drawerHasOpened when all text AND stickers are removed
  useEffect(() => {
    if (!hasText && !hasStickers) {
      setDrawerHasOpened(false);
    }
  }, [hasText, hasStickers]);

  // Determine if drawer should be collapsed:
  // - NEVER collapse text tab (we want to show inputs)
  // - NEVER collapse image tab (we want to show filter sliders)
  // - For draw tab: collapse if actively editing AND drawer hasn't been opened yet
  const isCollapsed = (activeTab === 'text' || activeTab === 'image') ? false : (isActivelyEditing && !drawerHasOpened);
  const wasCollapsedRef = useRef(isCollapsed);

  // Notify parent when drawer TRANSITIONS from collapsed to expanded
  // Also mark that drawer has opened (sticky state) so it stays open for subsequent edits
  useEffect(() => {
    if (wasCollapsedRef.current && !isCollapsed && onDrawerExpand) {
      setDrawerHasOpened(true); // Mark as opened - stays open until all text removed
      const timer = setTimeout(() => onDrawerExpand(), 150);
      wasCollapsedRef.current = isCollapsed;
      return () => clearTimeout(timer);
    }
    wasCollapsedRef.current = isCollapsed;
  }, [isCollapsed, onDrawerExpand]);

  return (
    <div
      className={`flex flex-col z-20 relative overflow-hidden ${className}`}
      role="region"
      aria-label="Editing Tools"
    >
      {/* Mode Switcher */}
      <div className="flex border-b border-slate-800 relative" role="tablist">
        {/* Animated Active Tab Indicator */}
        <div
          className={`absolute bottom-0 h-0.5 bg-brand transition-all duration-300 ease-out z-10 w-1/3 ${activeTab === "text" ? "left-0" : activeTab === "image" ? "left-1/3" : "left-2/3"
            }`}
        />

        <button
          onClick={() => handleTabChange("text")}
          role="tab"
          aria-selected={activeTab === "text"}
          style={{ touchAction: 'manipulation' }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 relative overflow-hidden active:scale-95 touch-target ${activeTab === "text"
            ? "text-white bg-white/10"
            : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            }`}
        >
          <Type className={`w-4 h-4 transition-transform duration-300 ${activeTab === "text" ? "scale-110" : "scale-100"}`} />
          Text
        </button>

        <div className="w-px bg-slate-800 z-0" role="presentation"></div>

        <button
          onClick={() => handleTabChange("image")}
          role="tab"
          aria-selected={activeTab === "image"}
          style={{ touchAction: 'manipulation' }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 relative overflow-hidden active:scale-95 touch-target ${activeTab === "image"
            ? "text-white bg-white/10"
            : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            }`}
        >
          <ImageIcon className={`w-4 h-4 transition-transform duration-300 ${activeTab === "image" ? "scale-110" : "scale-100"}`} />
          Image
        </button>

        <div className="w-px bg-slate-800 z-0" role="presentation"></div>

        <button
          onClick={() => handleTabChange("draw")}
          role="tab"
          aria-selected={activeTab === "draw"}
          style={{ touchAction: 'manipulation' }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 relative overflow-hidden active:scale-95 touch-target ${activeTab === "draw"
            ? "text-white bg-white/10"
            : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            }`}
        >
          <Pencil className={`w-4 h-4 transition-transform duration-300 ${activeTab === "draw" ? "scale-110" : "scale-100"}`} />
          Draw
        </button>
      </div>

      {/* Controls Area */}
      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-out ${isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
      >
        <div className="overflow-hidden">
          <div className={`flex flex-col justify-center transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100 px-6 py-6 min-h-[80px]'}`}>

            {/* TEXT CONTROLS */}
            {activeTab === "text" && (
              <div id="text-tools-panel" role="tabpanel" className="flex flex-col items-center justify-start w-full gap-6">

                {/* Group -1: Layout (Caption Bars) - Only show if we have text to layout */}
                {(hasText || hasStickers) && (
                <div className="w-full flex flex-nowrap justify-center items-center gap-4 sm:gap-5 md:gap-6 px-2 sm:px-4 min-w-0 animate-in fade-in duration-300">
                  {/* Top Bar Color Picker */}
                  <div className="color-picker-ring w-8 h-8 md:w-10 md:h-10 rounded-full shrink-0">
                    <div className="relative overflow-hidden w-full h-full rounded-full cursor-pointer">
                      <input
                        type="color"
                        value={meme.paddingTopColor || "#ffffff"}
                        onChange={(e) => handleStyleChange(e)}
                        name="paddingTopColor"
                        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
                        title="Top Bar Color"
                      />
                    </div>
                  </div>

                  {/* Top Caption Bar */}
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(10);
                      const isOn = meme.paddingTop > 0;
                      handleStyleChange({ currentTarget: { name: 'paddingTop', value: isOn ? 0 : 15 } }, true);

                      setTimeout(() => {
                        if (!isOn && meme.paddingBottom === 0) {
                          handleStyleChange({ currentTarget: { name: 'textColor', value: '#000000' } }, true);
                          handleStyleChange({ currentTarget: { name: 'textShadow', value: 'transparent' } }, true);
                        } else if (isOn && meme.paddingBottom === 0) {
                          handleStyleChange({ currentTarget: { name: 'textColor', value: '#ffffff' } }, true);
                          handleStyleChange({ currentTarget: { name: 'textShadow', value: '#000000' } }, true);
                        }
                      }, 50);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2.5 rounded-full transition-all active:scale-95 border uppercase font-bold tracking-wider shrink-0 touch-target ${meme.paddingTop > 0
                      ? "btn-brand"
                      : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-white hover:bg-white/10"
                      }`}
                    style={{ fontSize: 'clamp(0.65rem, 2.5vw, 0.75rem)' }}
                  >
                    {/* Custom SVG with filled top bar */}
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <rect x="3" y="3" width="18" height="6" rx="2" fill="currentColor" />
                    </svg>
                    <span className="hidden sm:inline whitespace-nowrap">Top Bar {meme.paddingTop > 0 ? "On" : "Off"}</span>
                  </button>

                  {/* Bottom Caption Bar */}
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(10);
                      const isOn = (meme.paddingBottom || 0) > 0;
                      handleStyleChange({ currentTarget: { name: 'paddingBottom', value: isOn ? 0 : 15 } }, true);

                      setTimeout(() => {
                        if (!isOn && meme.paddingTop === 0) {
                          handleStyleChange({ currentTarget: { name: 'textColor', value: '#000000' } }, true);
                          handleStyleChange({ currentTarget: { name: 'textShadow', value: 'transparent' } }, true);
                        } else if (isOn && meme.paddingTop === 0) {
                          handleStyleChange({ currentTarget: { name: 'textColor', value: '#ffffff' } }, true);
                          handleStyleChange({ currentTarget: { name: 'textShadow', value: '#000000' } }, true);
                        }
                      }, 50);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2.5 rounded-full transition-all active:scale-95 border uppercase font-bold tracking-wider shrink-0 touch-target ${(meme.paddingBottom || 0) > 0
                      ? "btn-brand"
                      : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-white hover:bg-white/10"
                      }`}
                    style={{ fontSize: 'clamp(0.65rem, 2.5vw, 0.75rem)' }}
                  >
                    {/* Custom SVG with filled bottom bar */}
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <rect x="3" y="15" width="18" height="6" rx="2" fill="currentColor" />
                    </svg>
                    <span className="hidden sm:inline whitespace-nowrap">Bottom Bar {(meme.paddingBottom || 0) > 0 ? "On" : "Off"}</span>
                  </button>

                  {/* Bottom Bar Color Picker */}
                  <div className="color-picker-ring w-8 h-8 md:w-10 md:h-10 rounded-full shrink-0">
                    <div className="relative overflow-hidden w-full h-full rounded-full cursor-pointer">
                      <input
                        type="color"
                        value={meme.paddingBottomColor || "#ffffff"}
                        onChange={(e) => handleStyleChange(e)}
                        name="paddingBottomColor"
                        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
                        title="Bottom Bar Color"
                      />
                    </div>
                  </div>
                </div>
                )}

                {/* Group 0: Font Selector (Horizontal Scroll) */}
                {hasText && (
                  <div className="w-full flex flex-col gap-2 animate-in fade-in duration-300">
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-thin snap-x mask-fade-sides cursor-pointer">
                      {FONTS.map((font) => (
                        <button
                          key={font.name}
                          onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(10);
                            handleStyleChange({ currentTarget: { name: 'fontFamily', value: font.name } }, true);
                          }}
                          className={`snap-center shrink-0 px-4 py-2 rounded-lg border text-sm transition-all active:scale-95 ${(meme.fontFamily || "Impact") === font.name
                            ? "bg-slate-100 text-slate-900 border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                            : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                            }`}
                          style={{ fontFamily: `${font.name}, sans-serif` }}
                        >
                          {font.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Animation Selector */}
                {hasText && (
                  <div className="w-full flex flex-col gap-2 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${hasAnimatedText ? 'text-brand' : 'text-slate-500'}`}>
                        Text Animation {hasAnimatedText && <span className="text-amber-400">• GIF Export</span>}
                      </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-thin snap-x mask-fade-sides cursor-pointer">
                      {TEXT_ANIMATIONS.map((anim) => {
                        // Check if ANY text has this animation
                        const isActive = meme.texts.some(t => t.animation === anim.id);
                        return (
                          <AnimationButton
                            key={anim.id}
                            anim={anim}
                            isActive={isActive}
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(10);
                              if (onAnimationChange) onAnimationChange(anim.id);
                            }}
                            variant="text"
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sticker Animation Selector */}
                {hasStickers && (
                  <div className="w-full flex flex-col gap-2 animate-in fade-in duration-300 slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${hasAnimatedSticker ? 'text-blue-400' : 'text-slate-500'}`}>
                        Sticker Animation {hasAnimatedSticker && <span className="text-amber-400">• GIF Export</span>}
                      </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-thin snap-x mask-fade-sides cursor-pointer">
                      {TEXT_ANIMATIONS.map((anim) => {
                        // Check if ANY sticker has this animation
                        const isActive = meme.stickers.some(s => s.animation === anim.id);
                        return (
                          <AnimationButton
                            key={anim.id}
                            anim={anim}
                            isActive={isActive}
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(10);
                              if (onStickerAnimationChange) onStickerAnimationChange(anim.id);
                            }}
                            variant="sticker"
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sticker Size Slider - Moved here */}
                {hasStickers && (
                  <div className="w-full flex items-center gap-4 animate-in slide-in-from-top-1 fade-in duration-300">
                    <Smile className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                    <OptimizedSlider
                      min="5" max="250" name="stickerSize"
                      value={meme.stickerSize || 60}
                      onChange={handleStyleChange}
                      onCommit={handleStyleCommit}
                      className="range-slider w-full cursor-pointer rounded-full opacity-90 h-2"
                      title="Sticker Size"
                    />
                  </div>
                )}




                {/* Text Content Area (Inputs) - Moved Here */}
                <div className="w-full animate-in fade-in duration-300">
                  <MemeInputs
                    embedded={true}
                    texts={meme.texts}
                    handleTextChange={handleTextChange}
                    onAddSticker={onAddSticker}
                    onMagicCaption={onMagicCaption}
                    isMagicGenerating={isMagicGenerating}
                    onChaos={onChaos}
                    hasStickers={hasStickers}
                    onExportStickers={onExportStickers}
                    selectedId={meme.selectedId}
                    editingId={editingId}
                    onEditingChange={onEditingChange}
                    hasText={hasText}
                  />
                </div>

                {/* Collapsible Text Styling Section */}
                {(hasText || hasStickers) && (
                  <>
                    {/* Toggle Button - All screen sizes */}
                    <button
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(10);
                        startTransition(() => setShowTextStyling(!showTextStyling));
                      }}
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-slate-800/50 border border-brand text-slate-400 hover:text-white hover:border-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all active:scale-[0.98]"
                    >
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {showTextStyling ? 'Hide' : 'Show'} Text Styling
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showTextStyling ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Collapsible Container with Grid Animation */}
                    <div
                      className={`w-full grid transition-[grid-template-rows] duration-300 ease-out ${showTextStyling ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                        }`}
                    >
                      <div className="w-full overflow-hidden">
                        <div className={`w-full flex flex-col gap-6 transition-opacity duration-200 ${showTextStyling ? 'opacity-100 pt-10' : 'opacity-0'
                          }`}>

                          {/* Group 1: Size Controls */}
                          <div className={`flex-1 w-full flex ${hasStickers ? 'flex-col gap-4' : 'items-center gap-4'}`}>
                            {hasText && (
                              <div className="flex flex-col w-full gap-2 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between w-full relative">
                                  {meme.fontSize != 40 && (
                                    <button
                                      onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(10);
                                        handleStyleChange({ currentTarget: { name: 'fontSize', value: 40 } }, true);
                                      }}
                                      className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] uppercase font-bold text-slate-500 hover:text-white transition-all active:scale-95 bg-slate-800/80 px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-slate-700/50"
                                    >
                                      Reset
                                    </button>
                                  )}
                                  <div className="flex items-center gap-4 w-full">
                                    <Type className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                                    <OptimizedSlider
                                      min="2" max="120" name="fontSize"
                                      value={meme.fontSize}
                                      onChange={handleStyleChange}
                                      onCommit={handleStyleCommit}
                                      className="range-slider w-full cursor-pointer rounded-full h-2"
                                      title="Font Size"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Divider */}
                          {(hasText || hasStickers) && <div className="w-full h-px bg-slate-800 shrink-0" aria-hidden="true" />}

                          {/* Group 2: Width Control */}
                          {hasText && (
                            <>
                              <div className="flex-1 w-full flex flex-col gap-2 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between w-full relative">
                                  {meme.maxWidth != 100 && (
                                    <button
                                      onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(10);
                                        handleStyleChange({ currentTarget: { name: 'maxWidth', value: 100 } }, true);
                                      }}
                                      className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] uppercase font-bold text-slate-500 hover:text-white transition-all active:scale-95 bg-slate-800/80 px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-slate-700/50"
                                    >
                                      Reset
                                    </button>
                                  )}
                                  <div className="flex items-center gap-4 w-full">
                                    <MoveHorizontal className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                                    <OptimizedSlider
                                      min="20" max="200" name="maxWidth"
                                      value={meme.maxWidth}
                                      onChange={handleStyleChange}
                                      onCommit={handleStyleCommit}
                                      className="range-slider w-full cursor-pointer rounded-full h-2"
                                      title="Text Width (Wrap)"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Divider */}
                              <div className="w-full h-px bg-slate-800 shrink-0" aria-hidden="true" />

                              {/* Group 2.5: Letter Spacing */}
                              <div className="flex-1 w-full flex flex-col gap-2 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between w-full relative">
                                  {meme.letterSpacing !== 0 && (
                                    <button
                                      onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(10);
                                        handleStyleChange({ currentTarget: { name: 'letterSpacing', value: 0 } }, true);
                                      }}
                                      className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] uppercase font-bold text-slate-500 hover:text-white transition-all active:scale-95 bg-slate-800/80 px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-slate-700/50"
                                    >
                                      Reset
                                    </button>
                                  )}
                                  <div className="flex items-center gap-4 w-full">
                                    <ArrowLeftRight className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                                    <OptimizedSlider
                                      min="-5" max="50" step="1" name="letterSpacing"
                                      value={meme.letterSpacing || 0}
                                      onChange={handleStyleChange}
                                      onCommit={handleStyleCommit}
                                      className="range-slider w-full cursor-pointer rounded-full h-2"
                                      title="Letter Spacing"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Divider */}
                              <div className="w-full h-px bg-slate-800 shrink-0" aria-hidden="true" />

                              {/* Group 3: Color Controls - Centered */}
                              <div className="w-full flex justify-center py-2">
                                <Suspense fallback={<div className="w-full md:w-auto h-20 bg-slate-800/20 rounded animate-pulse shrink-0" />}>
                                  <ColorControls
                                    meme={meme}
                                    handleStyleChange={handleStyleChange}
                                    handleStyleCommit={handleStyleCommit}
                                  />
                                </Suspense>
                              </div>
                            </>
                          )}

                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* IMAGE CONTROLS */}
            {activeTab === "image" && (
              <div id="image-tools-panel" role="tabpanel" className="flex flex-col gap-6 w-full items-center">
                {/* Global Filter Reset - Always Visible */}
                <button
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(15);
                    startTransition(() => onResetFilters());
                  }}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95 text-xs font-bold uppercase tracking-wide mb-2 animate-in fade-in slide-in-from-top-2"
                >
                  <RefreshCcw className="w-3 h-3" /> Reset All Filters
                </button>

                {/* Desktop: Vertical stacked layout with more breathing room */}
                {/* Mobile/Tablet: 2-column grid layout */}
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-6 lg:gap-y-8 w-full">

                  {/* Contrast */}
                  <div className="flex items-center gap-3">
                    <Contrast className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                    <OptimizedSlider
                      min="0" max="200" name="contrast"
                      value={meme.filters?.contrast ?? 100}
                      onChange={handleFilterChange}
                      onCommit={handleStyleCommit}
                      className="range-slider w-full cursor-pointer h-2 rounded-full"
                      title="Contrast"
                    />
                  </div>

                  {/* Brightness */}
                  <div className="flex items-center gap-3">
                    <Sun className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                    <OptimizedSlider
                      min="0" max="200" name="brightness"
                      value={meme.filters?.brightness ?? 100}
                      onChange={handleFilterChange}
                      onCommit={handleStyleCommit}
                      className="range-slider w-full cursor-pointer h-2 rounded-full"
                      title="Brightness"
                    />
                  </div>

                  {/* Blur */}
                  <div className="flex items-center gap-3">
                    <Blur className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                    <OptimizedSlider
                      min="0" max="10" step="0.5" name="blur"
                      value={meme.filters?.blur ?? 0}
                      onChange={handleFilterChange}
                      onCommit={handleStyleCommit}
                      className="range-slider w-full cursor-pointer h-2 rounded-full"
                      title="Blur"
                    />
                  </div>

                  {/* Grayscale */}
                  <div className="flex items-center gap-3">
                    <Grayscale className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                    <OptimizedSlider
                      min="0" max="100" name="grayscale"
                      value={meme.filters?.grayscale ?? 0}
                      onChange={handleFilterChange}
                      onCommit={handleStyleCommit}
                      className="range-slider w-full cursor-pointer h-2 rounded-full"
                      title="Grayscale"
                    />
                  </div>

                  {/* Sepia */}
                  <div className="flex items-center gap-3">
                    <Sepia className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                    <OptimizedSlider
                      min="0" max="100" name="sepia"
                      value={meme.filters?.sepia ?? 0}
                      onChange={handleFilterChange}
                      onCommit={handleStyleCommit}
                      className="range-slider w-full cursor-pointer h-2 rounded-full"
                      title="Sepia"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="flex items-center gap-3">
                    <Saturate className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                    <OptimizedSlider
                      min="0" max="300" name="saturate"
                      value={meme.filters?.saturate ?? 100}
                      onChange={handleFilterChange}
                      onCommit={handleStyleCommit}
                      className="range-slider w-full cursor-pointer h-2 rounded-full"
                      title="Saturation"
                    />
                  </div>

                  {/* Hue Rotate */}
                  <div className="flex items-center gap-3">
                    <HueRotate className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                    <OptimizedSlider
                      min="0" max="360" name="hueRotate"
                      value={meme.filters?.hueRotate ?? 0}
                      onChange={handleFilterChange}
                      onCommit={handleStyleCommit}
                      className="range-slider w-full cursor-pointer h-2 rounded-full"
                      title="Hue Rotate"
                    />
                  </div>

                  {/* Invert */}
                  <div className="flex items-center gap-3">
                    <Invert className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                    <OptimizedSlider
                      min="0" max="100" name="invert"
                      value={meme.filters?.invert ?? 0}
                      onChange={handleFilterChange}
                      onCommit={handleStyleCommit}
                      className="range-slider w-full cursor-pointer h-2 rounded-full"
                      title="Invert"
                    />
                  </div>
                </div>

                <div className="w-full h-px bg-slate-800 shrink-0 my-2" aria-hidden="true" />

                {/* Deep Fry Control */}
                <div className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-red-500 tracking-wider flex items-center gap-2">
                      Deep Fry
                    </span>
                    {meme.filters?.deepFry > 0 && (
                      <span className="text-[10px] font-bold text-red-400">{meme.filters.deepFry}%</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 w-full">
                    <Flame className={`w-5 h-5 transition-colors ${meme.filters?.deepFry > 0 ? 'text-red-500 animate-pulse' : 'text-slate-600'}`} />
                    <OptimizedSlider
                      min="0" max="100" name="deepFry"
                      value={meme.filters?.deepFry ?? 0}
                      onChange={handleFilterChange}
                      onCommit={handleStyleCommit}
                      filledColor="#ef4444"
                      trackColor="rgba(255, 255, 255, 0.1)"
                      className="range-slider w-full cursor-pointer h-2 rounded-full accent-red-500"
                      title="Deep Fry Level"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DRAW CONTROLS */}
            {activeTab === "draw" && (
              <div id="draw-tools-panel" role="tabpanel" className="flex flex-col gap-6 w-full items-center animate-in fade-in duration-300">
                {/* Tools */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTool('pen')}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-center ${activeTool === 'pen' ? 'bg-brand text-white border-brand shadow-lg shadow-orange-900/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                    title="Pen Tool"
                    aria-label="Use Pen Tool"
                  >
                    <img src="/images/canvas/marker-pen_32.png" className="w-5 h-5 object-contain" alt="Pen" />
                  </button>
                  <button
                    onClick={() => setActiveTool('eraser')}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-center ${activeTool === 'eraser' ? 'bg-brand text-white border-brand shadow-lg shadow-orange-900/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                    title="Eraser Tool"
                    aria-label="Use Eraser Tool"
                  >
                    <img src="/images/canvas/eraser_32.png" className="w-5 h-5 object-contain" alt="Eraser" />
                  </button>
                  <button
                    onClick={onClearDrawings}
                    className="p-3 rounded-xl border bg-slate-800 text-red-400 border-slate-700 hover:bg-red-900/20 hover:border-red-500/50 transition-all flex items-center justify-center"
                    title="Clear All"
                    aria-label="Clear All Drawings"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="w-full h-px bg-slate-800 shrink-0" aria-hidden="true" />

                {/* Settings */}
                <div className="flex items-center gap-8 w-full max-w-md px-4">
                  {/* Color */}
                  <div className="flex flex-col gap-2 items-center">
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Color</span>
                    <div className="relative overflow-hidden w-10 h-10 rounded-full ring-2 ring-slate-700 hover:ring-slate-500 transition-all cursor-pointer shadow-sm">
                      <input
                        type="color"
                        value={meme.drawColor || "#ff0000"}
                        onChange={(e) => handleStyleChange(e)}
                        name="drawColor"
                        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Width */}
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Stroke Width</span>
                      <span className="text-[10px] font-bold text-slate-400 font-mono">{meme.drawWidth}px</span>
                    </div>
                    <OptimizedSlider
                      min="1" max="50" name="drawWidth"
                      value={meme.drawWidth || 5}
                      onChange={handleStyleChange}
                      className="range-slider w-full cursor-pointer h-2 rounded-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
