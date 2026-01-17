import { useState, lazy, Suspense, useTransition, useEffect, useRef, useId } from "react";
import {
  Type,
  MoveHorizontal,
  ArrowLeftRight,
  Image as ImageIcon,
  Smile,
  Pencil,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { TEXT_ANIMATIONS } from "../../constants/textAnimations";
import OptimizedSlider from "../ui/OptimizedSlider";
import MemeInputs from "./MemeInputs";

// Lazy-loaded panels for code splitting
const ColorControls = lazy(() => import("./ColorControls"));
const ImageFiltersPanel = lazy(() => import("./ImageFiltersPanel"));
const DrawToolsPanel = lazy(() => import("./DrawToolsPanel"));

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
  { name: "Bebas Neue", label: "Bebas" },
  { name: "Luckiest Guy", label: "Lucky" },
  { name: "Bungee", label: "Arcade" },
  { name: "Lato", label: "Slim" },
  { name: "Russo One", label: "Russo" },
  { name: "Righteous", label: "Retro" },
  { name: "Fredoka", label: "Bubbly" },
  { name: "Rubik Mono One", label: "Chunky" },
  { name: "Press Start 2P", label: "Pixel" },
  { name: "Special Elite", label: "Typer" },
  { name: "Black Ops One", label: "Army" },
  { name: "Carter One", label: "Carter" },
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
      className={`snap-center shrink-0 px-3 py-2 rounded-lg text-sm transition-all active:scale-95 flex items-center gap-2 group ${isActive
        ? activeClasses
        : anim.id === 'none'
          ? "bg-[#181818] text-slate-500 border border-[#2f3336] hover:border-[#3e4347] hover:text-white"
          : "bg-[#181818] text-slate-400 border border-[#2f3336] hover:border-[#3e4347] hover:text-white"
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
  // Crop props
  onStartCrop, isCropping,
  className = ""
}) {
  const [activeTab, setActiveTab] = useState("text");
  const [isPending, startTransition] = useTransition();
  const baseId = useId();
  const [showSliders, setShowSliders] = useState(false); // Collapsed by default on mobile
  const [showTextStyling, setShowTextStyling] = useState(false); // Collapsed by default
  const [showTextContent, setShowTextContent] = useState(true); // Text content drawer visible by default
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

  // Manage overflow state for text styling drawer to prevent blank space when closed
  const [textStylingOverflow, setTextStylingOverflow] = useState("hidden");

  useEffect(() => {
    let timer;
    if (showTextStyling) {
      // Start hidden for the opening animation
      setTextStylingOverflow("hidden");
      // Switch to visible after animation completes to allow tooltips/sliders popup
      timer = setTimeout(() => {
        startTransition(() => setTextStylingOverflow("visible"));
      }, 300);
    } else {
      // Immediately hide when closing to clip content and prevent blank space
      setTextStylingOverflow("hidden");
    }
    return () => clearTimeout(timer);
  }, [showTextStyling]);

  return (
    <div
      className={`flex flex-col z-20 relative overflow-hidden ${className}`}
      role="region"
      aria-label="Editing Tools"
    >
      {/* Mode Switcher */}
      <div className="flex border-b border-[#2f3336] relative" role="tablist">
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

        <div className="w-px bg-[#181818] z-0" role="presentation"></div>

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

        <div className="w-px bg-[#181818] z-0" role="presentation"></div>

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
                <div className="w-full flex flex-col gap-3 animate-in fade-in duration-300">
                  {/* Creative Header */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-widest animate-text-shimmer bg-gradient-to-r from-brand via-yellow-300 to-brand bg-[length:200%_auto] bg-clip-text text-transparent">
                      Caption Bars
                    </span>
                  </div>

                  {/* Button Controls Row */}
                  <div className="w-full max-w-full flex flex-nowrap justify-center items-center gap-3 sm:gap-4 lg:gap-6 px-2 sm:px-4 min-w-0">
                  {/* Pair 1: Top Bar Control (Color on LEFT + Toggle) - Interlocked */}
                  <div className="flex flex-1 items-center caption-bar-group max-w-[50%]">
                    {/* Top Bar Color Picker with Icon - rounded left, flat right */}
                    <div className={`relative w-9 h-9 md:w-10 md:h-10 shrink-0 border-y border-l rounded-l-xl rounded-r-none overflow-hidden ${meme.paddingTop > 0 ? 'border-brand' : 'border-[#2f3336]'}`}>
                      <div className="relative w-full h-full cursor-pointer">
                        <input
                          id={`${baseId}-top-bar-color`}
                          type="color"
                          value={meme.paddingTopColor || "#ffffff"}
                          onChange={(e) => handleStyleChange(e)}
                          name="paddingTopColor"
                          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
                          title="Top Bar Color"
                        />
                      </div>
                      {/* Icon overlay */}
                      <svg className="absolute inset-0 m-auto w-4 h-4 pointer-events-none text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <rect x="3" y="3" width="18" height="6" rx="2" fill="currentColor" />
                      </svg>
                    </div>

                    {/* Top Caption Bar Button - flat left, rounded right */}
                    <button
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(10);
                        const isOn = meme.paddingTop > 0;

                        startTransition(() => {
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
                        });
                      }}
                      className={`flex flex-1 items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-r-xl rounded-l-none transition-all active:scale-[0.98] uppercase font-bold tracking-wider touch-target overflow-hidden min-w-0 ${meme.paddingTop > 0
                        ? "bg-brand text-slate-900 border-y border-r border-brand"
                        : "bg-[#181818] text-slate-400 border-y border-r border-[#2f3336] hover:border-[#3e4347] hover:text-white"
                        }`}
                      style={{ fontSize: 'clamp(0.65rem, 2.5vw, 0.75rem)' }}
                    >
                      <span className="whitespace-nowrap">Top {meme.paddingTop > 0 ? "On" : "Off"}</span>
                    </button>
                  </div>

                  {/* Pair 2: Bottom Bar Control (Toggle + Color on RIGHT) - Interlocked, mirrored */}
                  <div className="flex flex-1 items-center caption-bar-group max-w-[50%]">
                    {/* Bottom Caption Bar Button - rounded left, flat right */}
                    <button
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(10);
                        const isOn = (meme.paddingBottom || 0) > 0;

                        startTransition(() => {
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
                        });
                      }}
                      className={`flex flex-1 items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-l-xl rounded-r-none transition-all active:scale-[0.98] uppercase font-bold tracking-wider touch-target overflow-hidden min-w-0 ${(meme.paddingBottom || 0) > 0
                        ? "bg-brand text-slate-900 border-y border-l border-brand"
                        : "bg-[#181818] text-slate-400 border-y border-l border-[#2f3336] hover:border-[#3e4347] hover:text-white"
                        }`}
                      style={{ fontSize: 'clamp(0.65rem, 2.5vw, 0.75rem)' }}
                    >
                      <span className="whitespace-nowrap">Bottom {(meme.paddingBottom || 0) > 0 ? "On" : "Off"}</span>
                    </button>

                    {/* Bottom Bar Color Picker with Icon - flat left, rounded right */}
                    <div className={`relative w-9 h-9 md:w-10 md:h-10 shrink-0 border-y border-r rounded-r-xl rounded-l-none overflow-hidden ${(meme.paddingBottom || 0) > 0 ? 'border-brand' : 'border-[#2f3336]'}`}>
                      <div className="relative w-full h-full cursor-pointer">
                        <input
                          id={`${baseId}-bottom-bar-color`}
                          type="color"
                          value={meme.paddingBottomColor || "#ffffff"}
                          onChange={(e) => handleStyleChange(e)}
                          name="paddingBottomColor"
                          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
                          title="Bottom Bar Color"
                        />
                      </div>
                      {/* Icon overlay */}
                      <svg className="absolute inset-0 m-auto w-4 h-4 pointer-events-none text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <rect x="3" y="15" width="18" height="6" rx="2" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                </div>
                </div>
                )}

                {/* Show/Hide Text Content Drawer Toggle */}
                <button
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(10);
                    startTransition(() => setShowTextContent(!showTextContent));
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-[#181818] border border-[#2f3336] text-slate-400 hover:text-white hover:border-[#3e4347] focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all active:scale-[0.98]"
                >
                  {showTextContent ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {showTextContent ? 'Hide' : 'Show'} Text Editor
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showTextContent ? 'rotate-180' : ''}`} />
                </button>

                {/* Collapsible Text Content Drawer */}
                <div
                  className={`w-full grid transition-[grid-template-rows] duration-300 ease-out ${showTextContent ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                >
                  <div className="overflow-hidden">
                    <div className={`w-full flex flex-col gap-6 transition-opacity duration-200 ${showTextContent ? 'opacity-100 pt-4' : 'opacity-0'}`}>

                      {/* Font Selector (Horizontal Scroll) */}
                      {hasText && (
                        <div className="w-full flex flex-col gap-2 animate-in fade-in duration-300">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Font Family
                            </span>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pt-2 pb-4 -mx-6 px-6 scrollbar-thin snap-x mask-fade-sides cursor-pointer">
                            {FONTS.map((font) => (
                              <button
                                key={font.name}
                                onClick={() => {
                                  if (navigator.vibrate) navigator.vibrate(10);
                                  startTransition(() => {
                                      handleStyleChange({ currentTarget: { name: 'fontFamily', value: font.name } }, true);
                                  });
                                }}
                                className={`snap-center shrink-0 px-4 py-2 rounded-lg text-sm transition-all active:scale-95 ${(meme.fontFamily || "Roboto") === font.name
                                  ? "bg-slate-100 text-slate-900 border border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                                  : "bg-[#181818] text-slate-400 border border-[#2f3336] hover:border-[#3e4347] hover:text-white"
                                  }`}
                                style={{ fontFamily: `${font.name}, sans-serif` }}
                              >
                                {font.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Text Animation Selector */}
                      {hasText && (
                        <div className="w-full flex flex-col gap-2 animate-in fade-in duration-300">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${hasAnimatedText ? 'text-brand' : 'text-slate-500'}`}>
                              Text Animation {hasAnimatedText && <span className="text-amber-400">• GIF Export</span>}
                            </span>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pt-2 pb-4 -mx-6 px-6 scrollbar-thin snap-x mask-fade-sides cursor-pointer">
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
                                    if (onAnimationChange) {
                                      startTransition(() => {
                                          onAnimationChange(anim.id);
                                      });
                                    }
                                  }}
                                  variant="text"
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Text Content Area (Inputs) */}
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

                      {/* Sticker Animation Selector */}
                      {hasStickers && (
                        <div className="w-full flex flex-col gap-2 animate-in fade-in duration-300 slide-in-from-top-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${hasAnimatedSticker ? 'text-blue-400' : 'text-slate-500'}`}>
                              Sticker Animation {hasAnimatedSticker && <span className="text-amber-400">• GIF Export</span>}
                            </span>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pt-2 pb-4 -mx-6 px-6 scrollbar-thin snap-x mask-fade-sides cursor-pointer">
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
                                    if (onStickerAnimationChange) {
                                      startTransition(() => {
                                          onStickerAnimationChange(anim.id);
                                      });
                                    }
                                  }}
                                  variant="sticker"
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
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
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-[#181818] border border-[#2f3336] text-slate-400 hover:text-white hover:border-[#3e4347] focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all active:scale-[0.98]"
                    >
                      {showTextStyling ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
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
                      <div className={`w-full overflow-${textStylingOverflow}`}>
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
                                      className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] uppercase font-bold text-slate-500 hover:text-white transition-all active:scale-95 bg-[#181818]/80 px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-[#2f3336]"
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

                            {/* Sticker Size Slider - Inside Text Styling */}
                            {hasStickers && (
                              <div className="flex flex-col w-full gap-2 animate-in fade-in duration-300">
                                <div className="flex items-center gap-4 w-full">
                                  <Smile className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                                  <OptimizedSlider
                                    min="5" max="250" name="stickerSize"
                                    value={meme.stickerSize || 100}
                                    onChange={handleStyleChange}
                                    onCommit={handleStyleCommit}
                                    className="range-slider w-full cursor-pointer rounded-full h-2"
                                    title="Sticker Size"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Divider */}
                          {(hasText || hasStickers) && <div className="w-full h-px bg-[#181818] shrink-0" aria-hidden="true" />}

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
                                      className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] uppercase font-bold text-slate-500 hover:text-white transition-all active:scale-95 bg-[#181818]/80 px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-[#2f3336]"
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
                              <div className="w-full h-px bg-[#181818] shrink-0" aria-hidden="true" />

                              {/* Group 2.5: Letter Spacing */}
                              <div className="flex-1 w-full flex flex-col gap-2 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between w-full relative">
                                  {meme.letterSpacing !== 0 && (
                                    <button
                                      onClick={() => {
                                        if (navigator.vibrate) navigator.vibrate(10);
                                        handleStyleChange({ currentTarget: { name: 'letterSpacing', value: 0 } }, true);
                                      }}
                                      className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] uppercase font-bold text-slate-500 hover:text-white transition-all active:scale-95 bg-[#181818]/80 px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-[#2f3336]"
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
                              <div className="w-full h-px bg-[#181818] shrink-0" aria-hidden="true" />

                              {/* Group 3: Color Controls - Centered */}
                              <div className="w-[calc(100%+24px)] -mx-3 flex justify-center py-2 overflow-visible">
                                <Suspense fallback={<div className="w-full md:w-auto h-20 bg-[#181818]/20 rounded animate-pulse shrink-0" />}>
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

            {/* IMAGE CONTROLS - Lazy loaded */}
            {activeTab === "image" && (
              <Suspense fallback={<div className="w-full h-40 bg-[#181818]/20 rounded animate-pulse" />}>
                <ImageFiltersPanel
                  filters={meme.filters}
                  onFilterChange={handleFilterChange}
                  onStyleCommit={handleStyleCommit}
                  onResetFilters={onResetFilters}
                  onStartCrop={onStartCrop}
                  isCropping={isCropping}
                />
              </Suspense>
            )}

            {/* DRAW CONTROLS - Lazy loaded */}
            {activeTab === "draw" && (
              <Suspense fallback={<div className="w-full h-32 bg-[#181818]/20 rounded animate-pulse" />}>
                <DrawToolsPanel
                  activeTool={activeTool}
                  setActiveTool={setActiveTool}
                  drawColor={meme.drawColor}
                  drawWidth={meme.drawWidth}
                  onStyleChange={handleStyleChange}
                  onClearDrawings={onClearDrawings}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
