import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import OptimizedSlider from "../ui/OptimizedSlider";

export default function DrawToolsPanel({
  activeTool,
  setActiveTool,
  drawColor,
  drawWidth,
  onStyleChange,
  onClearDrawings,
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div
      id="draw-tools-panel"
      role="tabpanel"
      className="flex flex-col gap-6 w-full items-center animate-in fade-in duration-300"
    >
      {/* Tools */}
      <div className="flex gap-4">
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
        <button
          onClick={() => startTransition(() => onClearDrawings())}
          className="p-3 rounded-xl border bg-[#181818] text-red-400 border-[#2f3336] hover:bg-red-900/20 hover:border-red-500/50 transition-all flex items-center justify-center"
          title="Clear All"
          aria-label="Clear All Drawings"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full h-px bg-[#181818] shrink-0" aria-hidden="true" />

      {/* Settings */}
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
    </div>
  );
}
