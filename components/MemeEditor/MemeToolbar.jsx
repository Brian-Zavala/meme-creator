import { useState } from "react";
import {
  Type,
  Palette,
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
  Paintbrush as Brush,
} from "lucide-react";

export default function MemeToolbar({ meme, handleStyleChange, handleFilterChange, handleStyleCommit }) {
  const [activeTab, setActiveTab] = useState("text"); // 'text' | 'image'
  const hasStickers = meme.stickers && meme.stickers.length > 0;
  const hasText = meme.texts.some(t => (t.content || "").trim().length > 0);

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
          onClick={() => setActiveTab("text")}
          role="tab"
          aria-selected={activeTab === "text"}
          aria-controls="text-tools-panel"
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
          onClick={() => setActiveTab("image")}
          role="tab"
          aria-selected={activeTab === "image"}
          aria-controls="image-tools-panel"
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
      <div className="flex flex-col gap-6 px-4 py-5 min-h-[64px]">
        
        {/* TEXT CONTROLS */}
        {activeTab === "text" && (
          <div id="text-tools-panel" role="tabpanel" className="flex flex-wrap gap-6 items-center justify-between w-full">
            {/* Group 1: Size Controls */}
            <div className={`flex-1 min-w-[200px] flex ${hasStickers ? 'flex-col gap-4' : 'items-center gap-3'}`}>
                <div className="flex items-center gap-3 w-full">
                  <Type className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                  <label htmlFor="font-size-slider" className="sr-only">Font Size</label>
                  <input
                    id="font-size-slider"
                    type="range"
                    min="2"
                    max="120"
                    name="fontSize"
                    value={meme.fontSize}
                    onChange={handleStyleChange}
                    onMouseUp={handleStyleCommit}
                    onTouchEnd={handleStyleCommit}
                    className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-full h-2"
                    title="Font Size"
                  />
                </div>
                
                {hasStickers && (
                    <div className="flex items-center gap-3 w-full animate-in slide-in-from-top-1 fade-in duration-300">
                      <Smile className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                      <label htmlFor="sticker-size-slider" className="sr-only">Sticker Size</label>
                      <input
                        id="sticker-size-slider"
                        type="range"
                        min="5"
                        max="250"
                        name="stickerSize"
                        value={meme.stickerSize || 60}
                        onChange={handleStyleChange}
                        onMouseUp={handleStyleCommit}
                        onTouchEnd={handleStyleCommit}
                        className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-full opacity-90 h-2"
                        title="Sticker Size"
                      />
                    </div>
                )}
            </div>

            {/* Group 2: Width Control */}
            <div className="flex-1 min-w-[180px] flex items-center gap-3 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
              <MoveHorizontal className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
              <label htmlFor="max-width-slider" className="sr-only">Text Max Width</label>
              <input
                id="max-width-slider"
                type="range"
                min="20"
                max="100"
                name="maxWidth"
                value={meme.maxWidth}
                onChange={handleStyleChange}
                onMouseUp={handleStyleCommit}
                onTouchEnd={handleStyleCommit}
                className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-full h-2"
                title="Text Width (Wrap)"
              />
            </div>

            {/* Group 3: Color Controls */}
            <div className="flex items-center justify-end gap-5 min-w-[120px] border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 ml-auto">
              <div className="flex items-center gap-2" title="Text Color">
                <Palette className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                <div className="relative overflow-hidden w-9 h-9 rounded-full ring-2 ring-slate-700 hover:ring-slate-500 transition-all cursor-pointer focus-within:ring-yellow-500 shadow-sm">
                  <input
                    id="text-color-picker"
                    type="color"
                    name="textColor"
                    value={meme.textColor}
                    onChange={handleStyleChange}
                    onBlur={handleStyleCommit} 
                    className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
                  />
                </div>
              </div>

              {hasText && (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300" title="Background Color">
                  <Brush className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                  <div className="relative overflow-hidden w-9 h-9 rounded-full ring-2 ring-slate-700 hover:ring-slate-500 transition-all cursor-pointer focus-within:ring-yellow-500 shadow-sm">
                    <input
                      id="text-bg-color-picker"
                      type="color"
                      name="textBgColor"
                      value={meme.textBgColor === 'transparent' ? '#000000' : meme.textBgColor}
                      onChange={handleStyleChange}
                      onBlur={handleStyleCommit} 
                      className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
                    />
                  </div>
                  {meme.textBgColor !== 'transparent' && (
                    <button 
                      onClick={() => handleStyleChange({ currentTarget: { name: 'textBgColor', value: 'transparent' } }, true)}
                      className="text-[10px] uppercase font-bold text-slate-500 hover:text-white transition-colors bg-slate-800/50 px-2 py-1 rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* IMAGE CONTROLS */}
        {activeTab === "image" && (
          <div id="image-tools-panel" role="tabpanel" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            <div className="flex flex-col gap-5">
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

            <div className="flex flex-col gap-5 border-t sm:border-t-0 sm:border-l border-slate-800 pt-5 sm:pt-0 sm:pl-6">
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

            <div className="flex flex-col gap-5 border-t lg:border-t-0 lg:border-l border-slate-800 pt-5 lg:pt-0 lg:pl-6">
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

            <div className="flex flex-col gap-5 border-t lg:border-t-0 lg:border-l border-slate-800 pt-5 lg:pt-0 lg:pl-6">
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
        )}
      </div>
    </div>
  );
}