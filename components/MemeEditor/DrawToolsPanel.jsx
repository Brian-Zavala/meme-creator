import { useTransition } from "react";
import { Trash2, Hand, MousePointer2 } from "lucide-react";
import OptimizedSlider from "../ui/OptimizedSlider";

// Crisp inline SVG icons for each shape — 20×20 viewport, stroke-only, no fill
const ShapeIcons = {
  rectangle: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2" y="4" width="16" height="12" rx="1"/>
    </svg>
  ),
  circle: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <ellipse cx="10" cy="10" rx="8" ry="8"/>
    </svg>
  ),
  triangle: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="w-5 h-5">
      <polygon points="10,2 18,18 2,18"/>
    </svg>
  ),
  line: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5">
      <line x1="2" y1="18" x2="18" y2="2"/>
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="2" y1="10" x2="16" y2="10"/>
      <polyline points="11,5 16,10 11,15"/>
    </svg>
  ),
  star: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="w-5 h-5">
      <polygon points="10,2 12.4,7.5 18.5,7.5 13.8,11.3 15.7,17.5 10,14 4.3,17.5 6.2,11.3 1.5,7.5 7.6,7.5"/>
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="w-5 h-5">
      <path d="M10 17s-7-4.5-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 17 8c0 4.5-7 9-7 9z"/>
    </svg>
  ),
  diamond: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="w-5 h-5">
      <polygon points="10,2 18,10 10,18 2,10"/>
    </svg>
  ),
  "speech-bubble": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 3h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H7l-4 3V4a1 1 0 0 1 1-1z"/>
    </svg>
  ),
  "thought-bubble": (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <ellipse cx="10" cy="7" rx="6" ry="4"/>
      <circle cx="6" cy="13" r="1.5"/>
      <circle cx="4" cy="16.5" r="1"/>
    </svg>
  ),
};

const SHAPES = [
  { id: 'rectangle',    label: 'Rect' },
  { id: 'circle',       label: 'Circle' },
  { id: 'triangle',     label: 'Triangle' },
  { id: 'line',         label: 'Line' },
  { id: 'arrow',        label: 'Arrow' },
  { id: 'star',         label: 'Star' },
  { id: 'heart',        label: 'Heart' },
  { id: 'diamond',      label: 'Diamond' },
  { id: 'speech-bubble',label: 'Speech' },
  { id: 'thought-bubble',label: 'Thought' },
];

const isShapeActive = (activeTool) => activeTool?.startsWith('shape-');

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
  const [isPending, startTransition] = useTransition();

  const btnBase = "p-2.5 rounded-xl border transition-all flex flex-col items-center justify-center gap-1";
  const btnActive = "bg-brand text-white border-brand shadow-lg shadow-orange-900/20";
  const btnInactive = "bg-[#181818] text-slate-400 border-[#2f3336] hover:border-[#3e4347] hover:text-slate-200";

  return (
    <div
      id="draw-tools-panel"
      role="tabpanel"
      className="flex flex-col gap-5 w-full items-center animate-in fade-in duration-300"
    >
      {/* ── Row 1: Freehand tools ─────────────────────────────── */}
      <div className="flex gap-3 w-full justify-center">
        <button
          onClick={() => setActiveTool("pen")}
          className={`${btnBase} ${activeTool === "pen" ? btnActive : btnInactive} min-w-[60px]`}
          title="Pen"
        >
          <img src="/images/canvas/marker-pen_32.png" className="w-5 h-5 object-contain" alt="Pen" loading="lazy"/>
          <span className="text-[10px] font-semibold tracking-wide">Pen</span>
        </button>

        <button
          onClick={() => setActiveTool("eraser")}
          className={`${btnBase} ${activeTool === "eraser" ? btnActive : btnInactive} min-w-[60px]`}
          title="Eraser"
        >
          <img src="/images/canvas/eraser_32.png" className="w-5 h-5 object-contain" alt="Eraser" loading="lazy"/>
          <span className="text-[10px] font-semibold tracking-wide">Eraser</span>
        </button>

        <button
          onClick={() => setActiveTool("move")}
          className={`${btnBase} ${activeTool === "move" ? btnActive : btnInactive} min-w-[60px]`}
          title="Move Shapes"
        >
          <Hand className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-wide">Move</span>
        </button>

        {/* <button
          onClick={() => setActiveTool(null)}
          className={`${btnBase} ${!activeTool ? btnActive : btnInactive} min-w-[60px]`}
          title="Edit / Select"
        >
          <MousePointer2 className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-wide">Edit</span>
        </button> */}

        <button
          onClick={() => startTransition(() => onClearDrawings())}
          className={`${btnBase} ${btnInactive} text-red-400 hover:text-red-300 hover:border-red-900/50 min-w-[60px]`}
          title="Clear all drawings"
        >
          <Trash2 className="w-5 h-5"/>
          <span className="text-[10px] font-semibold tracking-wide">Clear</span>
        </button>
      </div>

      <div className="w-full h-px bg-[#1e1e1e]" />

      {/* ── Section label ─────────────────────────────────────── */}
      <div className="w-full flex items-center gap-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Shapes</span>
        {isShapeActive(activeTool) && (
          <span className="text-[10px] text-brand font-semibold ml-auto">
            {SHAPES.find(s => `shape-${s.id}` === activeTool)?.label}
          </span>
        )}
      </div>

      {/* ── Row 2: Shape grid (5×2) ───────────────────────────── */}
      <div className="grid grid-cols-5 gap-2 w-full">
        {SHAPES.map(shape => (
          <button
            key={shape.id}
            onClick={() => setActiveTool(`shape-${shape.id}`)}
            className={`${btnBase} ${activeTool === `shape-${shape.id}` ? btnActive : btnInactive}`}
            title={shape.label}
          >
            {ShapeIcons[shape.id]}
            <span className="text-[9px] font-semibold tracking-wide leading-none">{shape.label}</span>
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-[#1e1e1e]" />

      {/* ── Settings: pen/eraser ─────────────────────────────── */}
      {!isShapeActive(activeTool) && (
        <div className="flex items-center gap-6 w-full px-1">
          <div className="flex flex-col gap-1.5 items-center">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Color</span>
            <div className="relative overflow-hidden w-9 h-9 rounded-full ring-2 ring-[#2f3336] hover:ring-brand/50 transition-all cursor-pointer">
              <input type="color" value={drawColor || "#ff0000"} onChange={onStyleChange} name="drawColor"
                className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"/>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="flex justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Width</span>
              <span className="text-[10px] font-bold text-slate-400 font-mono">{drawWidth}px</span>
            </div>
            <OptimizedSlider min="1" max="50" name="drawWidth" value={drawWidth || 5} onChange={onStyleChange}
              className="range-slider w-full cursor-pointer h-2 rounded-full"/>
          </div>
        </div>
      )}

      {/* ── Settings: shape style ─────────────────────────────── */}
      {isShapeActive(activeTool) && (
        <div className="flex flex-col gap-4 w-full px-1">
          <div className="flex gap-5">
            {/* Stroke */}
            <div className="flex flex-col gap-1.5 items-center">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Stroke</span>
              <div className="relative overflow-hidden w-9 h-9 rounded-full ring-2 ring-[#2f3336] hover:ring-brand/50 transition-all cursor-pointer">
                <input type="color" value={shapeStroke || "#ff0000"} onChange={onStyleChange} name="shapeStroke"
                  className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer"/>
              </div>
            </div>
            {/* Fill */}
            <div className="flex flex-col gap-1.5 items-center">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Fill</span>
              <div className="relative overflow-hidden w-9 h-9 rounded-full ring-2 ring-[#2f3336] hover:ring-brand/50 transition-all cursor-pointer"
                style={{ background: shapeFill || 'transparent' }}>
                {!shapeFill && (
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 36 36">
                    <line x1="4" y1="32" x2="32" y2="4" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                )}
                <input type="color" value={shapeFill || "#ffffff"} onChange={onStyleChange} name="shapeFill"
                  className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 m-0 border-0 cursor-pointer opacity-0"/>
              </div>
            </div>
            {/* Width */}
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="flex justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Width</span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">{shapeStrokeWidth ?? 3}px</span>
              </div>
              <OptimizedSlider min="1" max="20" name="shapeStrokeWidth" value={shapeStrokeWidth || 3} onChange={onStyleChange}
                className="range-slider w-full cursor-pointer h-2 rounded-full"/>
            </div>
          </div>

          {/* No-fill toggle */}
          <button
            onClick={() => onStyleChange({ currentTarget: { name: 'shapeFill', value: shapeFill ? '' : '#ffffff' } })}
            className={`self-start px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${
              shapeFill ? 'bg-[#181818] text-slate-400 border-[#2f3336] hover:border-[#3e4347]'
                        : 'bg-brand/10 text-brand border-brand/30'}`}
          >
            {shapeFill ? 'No Fill' : '✓ No Fill'}
          </button>
        </div>
      )}
    </div>
  );
}
