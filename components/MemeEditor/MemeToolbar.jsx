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
} from "lucide-react";

const ColorControls = lazy(() => import("./ColorControls"));

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
          className={`absolute bottom-0 h-0.5 bg-[oklch(53%_0.187_39)] transition-all duration-300 ease-out z-10 ${
            activeTab === "text" ? "left-0 w-1/2" : "left-1/2 w-1/2"
          }`}
        />
        
        <button
          onClick={() => handleTabChange("text")}
          role="tab"
          aria-selected={activeTab === "text"}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 relative overflow-hidden ${
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
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 relative overflow-hidden ${
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
                
                {/* Group 1: Size Controls */}
                <div className={`flex-1 w-full flex ${hasStickers ? 'flex-col gap-4' : 'items-center gap-4'}`}>
                  {hasText && (
                    <div className="flex flex-col w-full gap-2 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between w-full relative">
                        {meme.fontSize != 40 && (
                          <button 
                            onClick={() => handleStyleChange({ currentTarget: { name: 'fontSize', value: 40 } }, true)}
                            className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] uppercase font-bold text-slate-500 hover:text-white transition-colors bg-slate-800/80 px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-slate-700/50"
                          >
                            Reset
                          </button>
                        )}
                        <div className="flex items-center gap-4 w-full">
                          <Type className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                          <input
                            type="range" min="2" max="120" name="fontSize"
                            value={meme.fontSize}
                            onChange={handleStyleChange}
                            onMouseUp={handleStyleCommit}
                            onTouchEnd={handleStyleCommit}
                            className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer rounded-full h-2"
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
                        onChange={handleStyleChange}
                        onMouseUp={handleStyleCommit}
                        onTouchEnd={handleStyleCommit}
                        className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer rounded-full opacity-90 h-2"
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
                            onClick={() => handleStyleChange({ currentTarget: { name: 'maxWidth', value: 100 } }, true)}
                            className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] uppercase font-bold text-slate-500 hover:text-white transition-colors bg-slate-800/80 px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-slate-700/50"
                          >
                            Reset
                          </button>
                        )}
                        <div className="flex items-center gap-4 w-full">
                          <MoveHorizontal className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                          <input
                            type="range" min="20" max="100" name="maxWidth"
                            value={meme.maxWidth}
                            onChange={handleStyleChange}
                            onMouseUp={handleStyleCommit}
                            onTouchEnd={handleStyleCommit}
                            className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer rounded-full h-2"
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
                {/* Global Filter Reset */}
                {(() => {
                  const filters = meme.filters || {};
                  const isModified = 
                    (filters.contrast ?? 100) !== 100 ||
                    (filters.brightness ?? 100) !== 100 ||
                    (filters.blur ?? 0) !== 0 ||
                    (filters.grayscale ?? 0) !== 0 ||
                    (filters.sepia ?? 0) !== 0 ||
                    (filters.hueRotate ?? 0) !== 0 ||
                    (filters.saturate ?? 100) !== 100 ||
                    (filters.invert ?? 0) !== 0;

                  if (!isModified) return null;

                  return (
                    <button
                      onClick={onResetFilters}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all text-xs font-bold uppercase tracking-wide mb-2 animate-in fade-in slide-in-from-top-2"
                    >
                      <RefreshCcw className="w-3 h-3" /> Reset All Filters
                    </button>
                  );
                })()}

                <div className="grid grid-cols-2 lg:flex lg:flex-row gap-x-4 gap-y-6 md:gap-8 lg:gap-10 w-full items-center">
                  <div className="flex-1 w-full flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                      <Contrast className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                      <input
                        type="range" min="0" max="200" name="contrast"
                        value={meme.filters?.contrast ?? 100}
                        onChange={handleFilterChange} onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer h-2"
                        title="Contrast"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Sun className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                      <input
                        type="range" min="0" max="200" name="brightness"
                        value={meme.filters?.brightness ?? 100}
                        onChange={handleFilterChange} onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer h-2"
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
                        onChange={handleFilterChange} onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer h-2"
                        title="Blur"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Grayscale className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                      <input
                        type="range" min="0" max="100" name="grayscale"
                        value={meme.filters?.grayscale ?? 0}
                        onChange={handleFilterChange} onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer h-2"
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
                        onChange={handleFilterChange} onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer h-2"
                        title="Sepia"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Saturate className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                      <input
                        type="range" min="0" max="300" name="saturate"
                        value={meme.filters?.saturate ?? 100}
                        onChange={handleFilterChange} onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer h-2"
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
                        onChange={handleFilterChange} onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer h-2"
                        title="Hue Rotate"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Invert className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                      <input
                        type="range" min="0" max="100" name="invert"
                        value={meme.filters?.invert ?? 0}
                        onChange={handleFilterChange} onMouseUp={handleStyleCommit} onTouchEnd={handleStyleCommit}
                        className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer h-2"
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