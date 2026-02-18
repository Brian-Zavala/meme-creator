import { useTransition, useState } from "react";
import { Trash2, ChevronDown } from "lucide-react";
import OptimizedSlider from "../ui/OptimizedSlider";
import { SHAPES } from "../../utils/shapeConstants.js";

export default function DrawToolsPanel({
  activeTool,
  setActiveTool,
  drawColor,
  drawWidth,
  onStyleChange,
  onClearDrawings,
  shapeFill,
  shapeStroke,
  shapeStrokeWidth,
}) {
  const [showShapes, setShowShapes] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div
      id="draw-tools-panel"
      role="tabpanel"
      className="flex flex-col gap-6 w-full items-center animate-in fade-in duration-300"
    >
      {/* Tools */}
      <div className="flex flex-col gap-4 w-full">
        {/* Drawing Tools */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setActiveTool("pen")}
            className={`p-3 rounded-xl border transition-all flex items-center justify-center ${
              activeTool === "pen"
                ? "bg-brand text-white border-brand shadow-lg shadow-orange-900/20"
                : "bg-[#181818] text-slate-400 border-[#2f3336] hover:border-[#3e4347]"
            }`}
            title="Pen Tool"
            aria-label="Use Pen Tool"
          >
            <img
              src="/images/canvas/marker-pen_32.png"
              className="w-5 h-5 object-contain"
              alt="Pen"
              loading="lazy"
            />
          </button>
          <button
            onClick={() => setActiveTool("eraser")}
            className={`p-3 rounded-xl border transition-all flex items-center justify-center ${
              activeTool === "eraser"
                ? "bg-brand text-white border-brand shadow-lg shadow-orange-900/20"
                : "bg-[#181818] text-slate-400 border-[#2f3336] hover:border-[#3e4347]"
            }`}
            title="Eraser Tool"
            aria-label="Use Eraser Tool"
          >
            <img
              src="/images/canvas/eraser_32.png"
              className="w-5 h-5 object-contain"
              alt="Eraser"
              loading="lazy"
            />
          </button>

          {/* Shapes - show first 4 inline, rest in dropdown */}
          {SHAPES.slice(0, 4).map(shape => (
            <button
              key={shape.id}
              onClick={() => setActiveTool(`shape-${shape.id}`)}
              className={`p-3 rounded-xl border transition-all flex items-center justify-center text-lg ${
                activeTool === `shape-${shape.id}`
                  ? "bg-brand text-white border-brand shadow-lg shadow-orange-900/20"
                  : "bg-[#181818] text-slate-400 border-[#2f3336] hover:border-[#3e4347]"
              }`}
              title={shape.label}
            >
              {shape.icon}
            </button>
          ))}

          {/* More Shapes Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowShapes(!showShapes)}
              className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-1 ${
                activeTool?.startsWith('shape-') && !activeTool.match(/shape-(rectangle|circle|triangle|line)/)
                  ? "bg-brand text-white border-brand shadow-lg shadow-orange-900/20"
                  : "bg-[#181818] text-slate-400 border-[#2f3336] hover:border-[#3e4347]"
              }`}
              title="More Shapes"
            >
              <span className="text-lg">⋯</span>
            </button>

            {/* More Shapes Grid (remaining 6 shapes) */}
            {showShapes && (
              <div className="absolute top-full mt-2 left-0 z-50 bg-[#181818] border border-[#2f3336] rounded-xl p-3 grid grid-cols-3 gap-2 min-w-[180px]">
                {SHAPES.slice(4).map(shape => (
                  <button
                    key={shape.id}
                    onClick={() => {
                      setActiveTool(`shape-${shape.id}`);
                      setShowShapes(false);
                    }}
                    className={`p-2 rounded-lg border transition-all flex items-center justify-center text-xl ${
                      activeTool === `shape-${shape.id}`
                        ? "bg-brand text-white border-brand"
                        : "bg-[#2f3336] text-slate-300 border-[#3e4347] hover:border-[#4d5256]"
                    }`}
                    title={shape.label}
                  >
                    {shape.icon}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => startTransition(() => onClearDrawings())}
            className="p-3 rounded-xl border bg-[#181818] text-red-400 border-[#2f3336] hover:bg-red-900/20 hover:border-red-500/50 transition-all flex items-center justify-center"
            title="Clear All"
            aria-label="Clear All Drawings"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="w-full h-px bg-[#181818] shrink-0" aria-hidden="true" />

      {/* Drawing Settings */}
      <div className="flex items-center gap-8 w-full max-w-md px-4">
        {/* Color */}
        <div className="flex flex-col gap-2 items-center">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
            Color
          </span>
          <div className="relative overflow-hidden w-10 h-10 rounded-full ring-2 ring-[#2f3336] hover:ring-[#3e4347] transition-all cursor-pointer shadow-sm">
            <input
              type="color"
              value={drawColor || "#ff0000"}
              onChange={(e) => onStyleChange(e)}
              name="drawColor"
              className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Width */}
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              Stroke Width
            </span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {drawWidth}px
            </span>
          </div>
          <OptimizedSlider
            min="1"
            max="50"
            name="drawWidth"
            value={drawWidth || 5}
            onChange={onStyleChange}
            className="range-slider w-full cursor-pointer h-2 rounded-full"
          />
        </div>
      </div>

      {/* Shape-specific Settings (when a shape tool is active) */}
      {activeTool?.startsWith('shape-') && (
        <>
          <div className="w-full h-px bg-[#181818] shrink-0" aria-hidden="true" />
          <div className="flex flex-col gap-4 w-full max-w-md px-4">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Shape Style
            </span>
            <div className="flex gap-6">
              {/* Stroke Color */}
              <div className="flex flex-col gap-2 items-center">
                <span className="text-[10px] font-bold text-slate-500">Stroke</span>
                <div className="relative overflow-hidden w-10 h-10 rounded-full ring-2 ring-[#2f3336] hover:ring-[#3e4347] transition-all cursor-pointer shadow-sm">
                  <input
                    type="color"
                    value={shapeStroke || "#ff0000"}
                    onChange={(e) => onStyleChange(e)}
                    name="shapeStroke"
                    className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Fill Color */}
              <div className="flex flex-col gap-2 items-center">
                <span className="text-[10px] font-bold text-slate-500">Fill</span>
                <div className="relative overflow-hidden w-10 h-10 rounded-full ring-2 ring-[#2f3336] hover:ring-[#3e4347] transition-all cursor-pointer shadow-sm">
                  <input
                    type="color"
                    value={shapeFill || "#ffffff"}
                    onChange={(e) => onStyleChange(e)}
                    name="shapeFill"
                    className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Stroke Width */}
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex justify-between">
                  <span className="text-[10px] font-bold text-slate-500">Width</span>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                    {shapeStrokeWidth}px
                  </span>
                </div>
                <OptimizedSlider
                  min="1"
                  max="20"
                  name="shapeStrokeWidth"
                  value={shapeStrokeWidth || 3}
                  onChange={onStyleChange}
                  className="range-slider w-full cursor-pointer h-2 rounded-full"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
