import { useState, lazy, Suspense, useTransition } from "react";
import {
  Type,
  MoveHorizontal,
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
} from "lucide-react";

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

export default function MemeToolbar({ meme, handleStyleChange, handleFilterChange, handleStyleCommit, onResetFilters }) {
  const [activeTab, setActiveTab] = useState("text"); // 'text' | 'image'
  const [isPending, startTransition] = useTransition();
  const hasStickers = meme.stickers && meme.stickers.length > 0;
  const hasText = meme.texts.some(t => (t.content || "").trim().length > 0);

  const handleTabChange = (tab) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };

  const isCollapsed = activeTab === 'text' && !hasText && !hasStickers;

  // Helper for range slider background
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
          className={`absolute bottom-0 h-0.5 bg-brand transition-all duration-300 ease-out z-10 ${
            activeTab === "text" ? "left-0 w-1/2" : "left-1/2 w-1/2"
          }`}
        />
        
        <button
          onClick={() => handleTabChange("text")}
          role="tab"
          aria-selected={activeTab === "text"}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 relative overflow-hidden active:scale-95 ${
            activeTab === "text"
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
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 relative overflow-hidden active:scale-95 ${
            activeTab === "image"
              ? "text-white bg-slate-800"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
          }`}
        >
          <ImageIcon className={`w-4 h-4 transition-transform duration-300 ${activeTab === "image" ? "scale-110" : "scale-100"}`} /> 
          Image
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
                
                {/* Group -1: Layout (Caption Bar) */}
                <div className="w-full flex justify-center animate-in fade-in duration-300">
                   <button
                     onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(10);
                        const isModern = meme.paddingTop > 0;
                        handleStyleChange({ currentTarget: { name: 'paddingTop', value: isModern ? 0 : 25 } }, true);
                        
                        setTimeout(() => {
                            if (!isModern) {
                                // Turning ON: Black text, no shadow
                                handleStyleChange({ currentTarget: { name: 'textColor', value: '#000000' } }, true);
                                handleStyleChange({ currentTarget: { name: 'textShadow', value: 'transparent' } }, true);
                            } else {
                                // Turning OFF: White text, black shadow (Classic)
                                handleStyleChange({ currentTarget: { name: 'textColor', value: '#ffffff' } }, true);
                                handleStyleChange({ currentTarget: { name: 'textShadow', value: '#000000' } }, true);
                            }
                        }, 50);
                     }}
                     className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all active:scale-95 border text-xs uppercase font-bold tracking-wider ${
                       meme.paddingTop > 0 
                       ? "bg-brand text-white border-brand shadow-lg shadow-orange-900/20" 
                       : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white"
                     }`}
                   >
                     <PanelTop className="w-4 h-4" />
                     {meme.paddingTop > 0 ? "Caption Bar On" : "Caption Bar Off"}
                   </button>
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
                          className={`snap-center shrink-0 px-4 py-2 rounded-lg border text-sm transition-all active:scale-95 ${
                            (meme.fontFamily || "Impact") === font.name
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

                {/* Divider */}
                {hasText && <div className="w-full h-px bg-slate-800 shrink-0" aria-hidden="true" />}
                
                {/* Group 1: Size Controls */}
                <div className={`flex-1 w-full flex ${hasStickers ? 'flex-col gap-4' : 'items-center gap-4'}`}>
                  {hasText && (
                    <div className="flex flex-col w-full gap-2 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between w-full relative">
                        {meme.fontSize != 30 && (
                          <button 
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(10);
                              handleStyleChange({ currentTarget: { name: 'fontSize', value: 30 } }, true);
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
                  
                  {hasStickers && (
                    <div className="flex items-center gap-4 w-full animate-in slide-in-from-top-1 fade-in duration-300">
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
                  </>
                )}

                {/* Group 3: Color Controls */}
                {hasText && (
                  <Suspense fallback={<div className="w-full md:w-auto h-20 bg-slate-800/20 rounded animate-pulse shrink-0" />}>
                    <ColorControls 
                      meme={meme} 
                      handleStyleChange={handleStyleChange} 
                      handleStyleCommit={handleStyleCommit} 
                    />
                  </Suspense>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}