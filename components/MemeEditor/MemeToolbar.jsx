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

export default function MemeToolbar({ meme, activeTool, setActiveTool, handleStyleChange, handleFilterChange, handleStyleCommit, onResetFilters, onClearDrawings, onDrawerExpand, onAnimationChange, onStickerAnimationChange }) {
  const [activeTab, setActiveTab] = useState("text");
  const [isPending, startTransition] = useTransition();
  const [showSliders, setShowSliders] = useState(false); // Collapsed by default on mobile
  const [showTextStyling, setShowTextStyling] = useState(true); // Default open for better discovery
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

  const isCollapsed = activeTab === 'text' && !hasText && !hasStickers;
  const wasCollapsedRef = useRef(isCollapsed);

  // Notify parent when drawer TRANSITIONS from collapsed to expanded
  useEffect(() => {
    if (wasCollapsedRef.current && !isCollapsed && onDrawerExpand) {
      const timer = setTimeout(() => onDrawerExpand(), 150);
      wasCollapsedRef.current = isCollapsed;
      return () => clearTimeout(timer);
    }
    wasCollapsedRef.current = isCollapsed;
  }, [isCollapsed, onDrawerExpand]);

  const getSliderStyle = (value, min, max) => {
    const val = ((value - min) / (max - min)) * 100;
    const color = 'var(--color-brand)';
    const track = 'rgba(255, 255, 255, 0.2)';
    return {
      background: `linear-gradient(to right, ${color} 0%, ${color} ${val}%, ${track} ${val}%, ${track} 100%)`
    };
  };

  return (
    <div
      className="flex flex-col bg-slate-900 border-b border-slate-800 backdrop-blur-md z-20 relative rounded-t-2xl"
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
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 relative overflow-hidden active:scale-95 ${activeTab === "text"
            ? "text-white bg-slate-800"
            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
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
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 relative overflow-hidden active:scale-95 ${activeTab === "image"
            ? "text-white bg-slate-800"
            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
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
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 relative overflow-hidden active:scale-95 ${activeTab === "draw"
            ? "text-white bg-slate-800"
            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
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

                {/* Group -1: Layout (Caption Bars) */}
                <div className="w-full flex justify-center items-center gap-4 sm:gap-5 px-4 animate-in fade-in duration-300">
                  {/* Top Bar Color Picker */}
                  <div className="color-picker-ring w-8 h-8 md:w-10 md:h-10 rounded-full shrink-0 sm:mr-2">
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
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full transition-all active:scale-95 border uppercase font-bold tracking-wider ${meme.paddingTop > 0
                      ? "bg-brand text-white border-brand shadow-lg shadow-orange-900/20"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                      }`}
                    style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.75rem)' }}
                  >
                    <PanelTop className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="whitespace-nowrap">Top Bar {meme.paddingTop > 0 ? "On" : "Off"}</span>
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
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full transition-all active:scale-95 border uppercase font-bold tracking-wider ${(meme.paddingBottom || 0) > 0
                      ? "bg-brand text-white border-brand shadow-lg shadow-orange-900/20"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                      }`}
                    style={{ fontSize: 'clamp(0.6rem, 2.5vw, 0.75rem)' }}
                  >
                    <PanelBottom className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="whitespace-nowrap">Bottom Bar {(meme.paddingBottom || 0) > 0 ? "On" : "Off"}</span>
                  </button>

                  {/* Bottom Bar Color Picker */}
                  <div className="color-picker-ring w-8 h-8 md:w-10 md:h-10 rounded-full shrink-0 sm:ml-2">
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
                          <button
                            key={anim.id}
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(10);
                              if (onAnimationChange) onAnimationChange(anim.id);
                            }}
                            className={`snap-center shrink-0 px-3 py-2 rounded-lg border text-sm transition-all active:scale-95 flex items-center gap-2 ${isActive
                              ? "bg-brand/20 text-brand border-brand font-bold shadow-[0_0_10px_rgba(255,199,0,0.3)]"
                              : anim.id === 'none'
                                ? "bg-slate-900 text-slate-500 border-slate-700 hover:border-slate-500 hover:text-white"
                                : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                              }`}
                          >
                            {anim.icon.includes('/') || anim.icon.includes('.') ? (
                              <img src={anim.icon} alt={anim.name} className="w-6 h-6 object-contain" />
                            ) : (
                              <span className="text-base">{anim.icon}</span>
                            )}
                            <span className="text-xs uppercase font-bold tracking-wide">{anim.name}</span>
                          </button>
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
                          <button
                            key={anim.id}
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(10);
                              if (onStickerAnimationChange) onStickerAnimationChange(anim.id);
                            }}
                            className={`snap-center shrink-0 px-3 py-2 rounded-lg border text-sm transition-all active:scale-95 flex items-center gap-2 ${isActive
                              ? "bg-blue-500/20 text-blue-400 border-blue-500 font-bold shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                              : anim.id === 'none'
                                ? "bg-slate-900 text-slate-500 border-slate-700 hover:border-slate-500 hover:text-white"
                                : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                              }`}
                          >
                            {anim.icon.includes('/') || anim.icon.includes('.') ? (
                              <img src={anim.icon} alt={anim.name} className="w-6 h-6 object-contain" />
                            ) : (
                              <span className="text-base">{anim.icon}</span>
                            )}
                            <span className="text-xs uppercase font-bold tracking-wide">{anim.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sticker Size Slider - Moved here */}
                {hasStickers && (
                  <div className="w-full flex items-center gap-4 animate-in slide-in-from-top-1 fade-in duration-300">
                    <Smile className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                    <input
                      type="range" min="5" max="250" name="stickerSize"
                      value={meme.stickerSize || 60}
                      onChange={(e) => {
                        if (navigator.vibrate) navigator.vibrate(5);
                        handleStyleChange(e);
                      }}
                      onMouseUp={handleStyleCommit}
                      onTouchEnd={handleStyleCommit}
                      className="range-slider w-full cursor-pointer rounded-full opacity-90 h-2"
                      style={getSliderStyle(meme.stickerSize || 60, 5, 250)}
                      title="Sticker Size"
                    />
                  </div>
                )}

                {/* Divider */}
                {hasText && !hasStickers && <div className="w-full h-px bg-slate-800 shrink-0" aria-hidden="true" />}

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
                                  {meme.fontSize != 24 && (
                                    <button
                                      onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(10);
                                        handleStyleChange({ currentTarget: { name: 'fontSize', value: 24 } }, true);
                                      }}
                                      className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] uppercase font-bold text-slate-500 hover:text-white transition-all active:scale-95 bg-slate-800/80 px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-slate-700/50"
                                    >
                                      Reset
                                    </button>
                                  )}
                                  <div className="flex items-center gap-4 w-full">
                                    <Type className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                                    <input
                                      type="range" min="2" max="120" name="fontSize"
                                      value={meme.fontSize}
                                      onChange={(e) => {
                                        if (navigator.vibrate) navigator.vibrate(5);
                                        handleStyleChange(e);
                                      }}
                                      onMouseUp={handleStyleCommit}
                                      onTouchEnd={handleStyleCommit}
                                      className="range-slider w-full cursor-pointer rounded-full h-2"
                                      style={getSliderStyle(meme.fontSize, 2, 120)}
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
                                    <input
                                      type="range" min="20" max="100" name="maxWidth"
                                      value={meme.maxWidth}
                                      onChange={(e) => {
                                        if (navigator.vibrate) navigator.vibrate(5);
                                        handleStyleChange(e);
                                      }}
                                      onMouseUp={handleStyleCommit}
                                      onTouchEnd={handleStyleCommit}
                                      className="range-slider w-full cursor-pointer rounded-full h-2"
                                      style={getSliderStyle(meme.maxWidth, 20, 100)}
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
                                    <input
                                      type="range" min="-5" max="50" step="1" name="letterSpacing"
                                      value={meme.letterSpacing || 0}
                                      onChange={(e) => {
                                        if (navigator.vibrate) navigator.vibrate(5);
                                        handleStyleChange(e);
                                      }}
                                      onMouseUp={handleStyleCommit}
                                      onTouchEnd={handleStyleCommit}
                                      className="range-slider w-full cursor-pointer rounded-full h-2"
                                      style={getSliderStyle(meme.letterSpacing || 0, -5, 50)}
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

                <div className="grid grid-cols-2 lg:flex lg:flex-row gap-x-4 gap-y-6 md:gap-8 lg:gap-10 w-full items-center">
                  <div className="flex-1 w-full flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                      <Contrast className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                      <input
                        type="range" min="0" max="200" name="contrast"
                        value={meme.filters?.contrast ?? 100}
                        onChange={(e) => {
                          if (navigator.vibrate) navigator.vibrate(5);
                          handleFilterChange(e);
                        }}
                        onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="range-slider w-full cursor-pointer h-2 rounded-full"
                        style={getSliderStyle(meme.filters?.contrast ?? 100, 0, 200)}
                        title="Contrast"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Sun className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                      <input
                        type="range" min="0" max="200" name="brightness"
                        value={meme.filters?.brightness ?? 100}
                        onChange={(e) => {
                          if (navigator.vibrate) navigator.vibrate(5);
                          handleFilterChange(e);
                        }}
                        onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="range-slider w-full cursor-pointer h-2 rounded-full"
                        style={getSliderStyle(meme.filters?.brightness ?? 100, 0, 200)}
                        title="Brightness"
                      />
                    </div>
                  </div>

                  <div className="hidden lg:block w-px h-10 bg-slate-800 shrink-0" aria-hidden="true" />

                  <div className="flex-1 w-full flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                      <Blur className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                      <input
                        type="range" min="0" max="10" step="0.5" name="blur"
                        value={meme.filters?.blur ?? 0}
                        onChange={(e) => {
                          if (navigator.vibrate) navigator.vibrate(5);
                          handleFilterChange(e);
                        }}
                        onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="range-slider w-full cursor-pointer h-2 rounded-full"
                        style={getSliderStyle(meme.filters?.blur ?? 0, 0, 10)}
                        title="Blur"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Grayscale className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                      <input
                        type="range" min="0" max="100" name="grayscale"
                        value={meme.filters?.grayscale ?? 0}
                        onChange={(e) => {
                          if (navigator.vibrate) navigator.vibrate(5);
                          handleFilterChange(e);
                        }}
                        onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="range-slider w-full cursor-pointer h-2 rounded-full"
                        style={getSliderStyle(meme.filters?.grayscale ?? 0, 0, 100)}
                        title="Grayscale"
                      />
                    </div>
                  </div>

                  <div className="hidden lg:block w-px h-10 bg-slate-800 shrink-0" aria-hidden="true" />

                  <div className="flex-1 w-full flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                      <Sepia className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                      <input
                        type="range" min="0" max="100" name="sepia"
                        value={meme.filters?.sepia ?? 0}
                        onChange={(e) => {
                          if (navigator.vibrate) navigator.vibrate(5);
                          handleFilterChange(e);
                        }}
                        onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="range-slider w-full cursor-pointer h-2 rounded-full"
                        style={getSliderStyle(meme.filters?.sepia ?? 0, 0, 100)}
                        title="Sepia"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Saturate className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                      <input
                        type="range" min="0" max="300" name="saturate"
                        value={meme.filters?.saturate ?? 100}
                        onChange={(e) => {
                          if (navigator.vibrate) navigator.vibrate(5);
                          handleFilterChange(e);
                        }}
                        onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="range-slider w-full cursor-pointer h-2 rounded-full"
                        style={getSliderStyle(meme.filters?.saturate ?? 100, 0, 300)}
                        title="Saturation"
                      />
                    </div>
                  </div>

                  <div className="hidden lg:block w-px h-10 bg-slate-800 shrink-0" aria-hidden="true" />

                  <div className="flex-1 w-full flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                      <HueRotate className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                      <input
                        type="range" min="0" max="360" name="hueRotate"
                        value={meme.filters?.hueRotate ?? 0}
                        onChange={(e) => {
                          if (navigator.vibrate) navigator.vibrate(5);
                          handleFilterChange(e);
                        }}
                        onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="range-slider w-full cursor-pointer h-2 rounded-full"
                        style={getSliderStyle(meme.filters?.hueRotate ?? 0, 0, 360)}
                        title="Hue Rotate"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Invert className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                      <input
                        type="range" min="0" max="100" name="invert"
                        value={meme.filters?.invert ?? 0}
                        onChange={(e) => {
                          if (navigator.vibrate) navigator.vibrate(5);
                          handleFilterChange(e);
                        }}
                        onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="range-slider w-full cursor-pointer h-2 rounded-full"
                        style={getSliderStyle(meme.filters?.invert ?? 0, 0, 100)}
                        title="Invert"
                      />
                    </div>
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
                    <input
                      type="range" min="0" max="100" name="deepFry"
                      value={meme.filters?.deepFry ?? 0}
                      onChange={(e) => {
                        if (navigator.vibrate) navigator.vibrate(5);
                        handleFilterChange(e);
                      }}
                      onMouseUp={handleStyleCommit}
                      onTouchEnd={handleStyleCommit}
                      className="range-slider w-full cursor-pointer h-2 rounded-full accent-red-500"
                      style={{
                        background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${(meme.filters?.deepFry ?? 0)}%, rgba(255, 255, 255, 0.1) ${(meme.filters?.deepFry ?? 0)}%, rgba(255, 255, 255, 0.1) 100%)`
                      }}
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
                    className={`p-3 rounded-xl border transition-all ${activeTool === 'pen' ? 'bg-brand text-white border-brand shadow-lg shadow-orange-900/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                    title="Pen Tool"
                  >
                    <img src="/images/canvas/marker-pen_32.png" className="w-5 h-5 object-contain" alt="Pen" />
                  </button>
                  <button
                    onClick={() => setActiveTool('eraser')}
                    className={`p-3 rounded-xl border transition-all ${activeTool === 'eraser' ? 'bg-brand text-white border-brand shadow-lg shadow-orange-900/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                    title="Eraser Tool"
                  >
                    <img src="/images/canvas/eraser_32.png" className="w-5 h-5 object-contain" alt="Eraser" />
                  </button>
                  <button
                    onClick={onClearDrawings}
                    className="p-3 rounded-xl border bg-slate-800 text-red-400 border-slate-700 hover:bg-red-900/20 hover:border-red-500/50 transition-all"
                    title="Clear All"
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
                    <input
                      type="range" min="1" max="50" name="drawWidth"
                      value={meme.drawWidth || 5}
                      onChange={(e) => handleStyleChange(e)}
                      className="range-slider w-full cursor-pointer h-2 rounded-full"
                      style={getSliderStyle(meme.drawWidth || 5, 1, 50)}
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