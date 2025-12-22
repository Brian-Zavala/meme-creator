import { useState } from "react";
import { Type, Palette, MoveHorizontal, Image as ImageIcon, Sun, Contrast, Droplets, Smile, Github as Grayscale, Wind as Sepia, RotateCcw as HueRotate, Zap as Saturate, ShieldAlert as Invert } from "lucide-react";

export default function MemeToolbar({ meme, handleStyleChange, handleFilterChange, handleStyleCommit }) {
  const [activeTab, setActiveTab] = useState("text"); // 'text' | 'image'
  const hasStickers = meme.stickers && meme.stickers.length > 0;

  return (
    <div 
      className="flex flex-col bg-slate-900 border-b border-slate-800 backdrop-blur-md z-20 relative rounded-t-2xl"
      role="region" 
      aria-label="Editing Tools"
    >
      {/* Mode Switcher */}
      <div className="flex border-b border-slate-800" role="tablist">
        <button
          onClick={() => setActiveTab("text")}
          role="tab"
          aria-selected={activeTab === "text"}
          aria-controls="text-tools-panel"
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === "text"
              ? "text-white bg-slate-800"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
          }`}
        >
          <Type className="w-4 h-4" /> Text
        </button>
        <div className="w-px bg-slate-800" role="presentation"></div>
        <button
          onClick={() => setActiveTab("image")}
          role="tab"
          aria-selected={activeTab === "image"}
          aria-controls="image-tools-panel"
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === "image"
              ? "text-white bg-slate-800"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
          }`}
        >
          <ImageIcon className="w-4 h-4" /> Image
        </button>
      </div>

      {/* Controls Area */}
      <div className="flex items-center gap-6 px-4 py-3 min-h-[64px] overflow-x-auto no-scrollbar">
        
        {/* TEXT CONTROLS */}
        {activeTab === "text" && (
          <div id="text-tools-panel" role="tabpanel" className="flex items-center gap-6 w-full">
            <div className={`flex ${hasStickers ? 'flex-col items-start gap-2' : 'items-center gap-3'} flex-1`}>
                <div className="flex items-center gap-3 w-full">
                  <Type className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  <label htmlFor="font-size-slider" className="sr-only">Font Size</label>
                  <input
                    id="font-size-slider"
                    type="range"
                    min="10"
                    max="80"
                    name="fontSize"
                    value={meme.fontSize}
                    onChange={handleStyleChange}
                    onMouseUp={handleStyleCommit}
                    className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-full"
                    title="Font Size"
                    aria-valuemin="10"
                    aria-valuemax="80"
                    aria-valuenow={meme.fontSize}
                  />
                </div>
                
                {hasStickers && (
                    <div className="flex items-center gap-3 w-full animate-in slide-in-from-top-1 fade-in duration-300">
                      <Smile className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      <label htmlFor="sticker-size-slider" className="sr-only">Sticker Size</label>
                      <input
                        id="sticker-size-slider"
                        type="range"
                        min="20"
                        max="150"
                        name="stickerSize"
                        value={meme.stickerSize || 60}
                        onChange={handleStyleChange}
                        onMouseUp={handleStyleCommit}
                        className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-full opacity-90"
                        title="Sticker Size"
                        aria-valuemin="20"
                        aria-valuemax="150"
                        aria-valuenow={meme.stickerSize || 60}
                      />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 flex-1 border-l border-slate-700 pl-6">
              <MoveHorizontal className="w-4 h-4 text-slate-400" aria-hidden="true" />
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
                className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-full"
                title="Text Width (Wrap)"
                aria-valuemin="20"
                aria-valuemax="100"
                aria-valuenow={meme.maxWidth}
              />
            </div>

            <div className="flex items-center gap-3 border-l border-slate-700 pl-6">
              <Palette className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <div className="relative overflow-hidden w-8 h-8 rounded-full ring-2 ring-slate-700 hover:ring-slate-500 transition-all cursor-pointer focus-within:ring-yellow-500">
                <label htmlFor="text-color-picker" className="sr-only">Text Color</label>
                <input
                  id="text-color-picker"
                  type="color"
                  name="textColor"
                  value={meme.textColor}
                  onChange={handleStyleChange}
                  onBlur={handleStyleCommit} 
                  className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
                  title="Text Color"
                />
              </div>
            </div>
          </div>
        )}

        {/* IMAGE CONTROLS */}
        {activeTab === "image" && (
          <div id="image-tools-panel" role="tabpanel" className="flex items-center gap-6 w-auto min-w-max pb-1">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 min-w-[140px]">
                <Contrast className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  type="range" min="0" max="200" name="contrast"
                  value={meme.filters?.contrast ?? 100}
                  onChange={handleFilterChange} onMouseUp={handleStyleCommit}
                  className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer"
                  title="Contrast"
                />
              </div>
              <div className="flex items-center gap-3 min-w-[140px]">
                <Sun className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  type="range" min="0" max="200" name="brightness"
                  value={meme.filters?.brightness ?? 100}
                  onChange={handleFilterChange} onMouseUp={handleStyleCommit}
                  className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer"
                  title="Brightness"
                />
              </div>
            </div>

            <div className="w-px h-12 bg-slate-700"></div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 min-w-[140px]">
                <Droplets className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  type="range" min="0" max="10" step="0.5" name="blur"
                  value={meme.filters?.blur ?? 0}
                  onChange={handleFilterChange} onMouseUp={handleStyleCommit}
                  className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer"
                  title="Blur"
                />
              </div>
              <div className="flex items-center gap-3 min-w-[140px]">
                <Grayscale className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  type="range" min="0" max="100" name="grayscale"
                  value={meme.filters?.grayscale ?? 0}
                  onChange={handleFilterChange} onMouseUp={handleStyleCommit}
                  className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer"
                  title="Grayscale"
                />
              </div>
            </div>

            <div className="w-px h-12 bg-slate-700"></div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 min-w-[140px]">
                <Sepia className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  type="range" min="0" max="100" name="sepia"
                  value={meme.filters?.sepia ?? 0}
                  onChange={handleFilterChange} onMouseUp={handleStyleCommit}
                  className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer"
                  title="Sepia"
                />
              </div>
              <div className="flex items-center gap-3 min-w-[140px]">
                <Saturate className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  type="range" min="0" max="300" name="saturate"
                  value={meme.filters?.saturate ?? 100}
                  onChange={handleFilterChange} onMouseUp={handleStyleCommit}
                  className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer"
                  title="Saturation"
                />
              </div>
            </div>

            <div className="w-px h-12 bg-slate-700"></div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 min-w-[140px]">
                <HueRotate className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  type="range" min="0" max="360" name="hueRotate"
                  value={meme.filters?.hueRotate ?? 0}
                  onChange={handleFilterChange} onMouseUp={handleStyleCommit}
                  className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer"
                  title="Hue Rotate"
                />
              </div>
              <div className="flex items-center gap-3 min-w-[140px]">
                <Invert className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  type="range" min="0" max="100" name="invert"
                  value={meme.filters?.invert ?? 0}
                  onChange={handleFilterChange} onMouseUp={handleStyleCommit}
                  className="w-full accent-[oklch(53%_0.187_39)] cursor-pointer"
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
