import ToolPill from "../ToolPill";

const DRAW_TOOLS = [
  { id: "pen",    label: "Pen",    icon: "✏" },
  { id: "eraser", label: "Eraser", icon: "⬜" },
];

const COLORS = [
  "#ffffff", "#000000", "#ef4444", "#3b82f6",
  "#eab308", "#22c55e", "#a855f7",
];

export default function DrawToolRow({ activeTool, onToolTap, canvasActiveTool, drawColor, onClearDrawings }) {
  return (
    <>
      {DRAW_TOOLS.map(({ id, label, icon }) => (
        <ToolPill
          key={id}
          icon={<span className="text-sm leading-none">{icon}</span>}
          label={label}
          isActive={canvasActiveTool === id}
          onClick={() => onToolTap(id)}
        />
      ))}

      {/* Clear button */}
      <button
        type="button"
        onClick={onClearDrawings}
        className="tool-pill"
        style={{ color: "#f87171", borderColor: "#3f1a1a" }}
      >
        <span className="text-sm leading-none">🗑</span>
        <span>Clear</span>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-[#2f3336] flex-shrink-0 mx-1" />

      {/* Color dots */}
      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onToolTap(`color-${color}`)}
          className="draw-color-dot flex-shrink-0"
          style={{
            backgroundColor: color,
            borderColor: (drawColor || "#ff0000") === color ? "white" : "transparent",
            outline: (drawColor || "#ff0000") === color ? "2px solid white" : "none",
          }}
          aria-label={`Draw color ${color}`}
        />
      ))}

      {/* Custom color picker trigger */}
      <button
        type="button"
        onClick={() => onToolTap("color-picker")}
        className="draw-color-dot flex-shrink-0 flex items-center justify-center bg-[#181818] border border-[#2f3336] text-slate-400 text-xs font-bold"
        aria-label="Custom color"
      >
        +
      </button>
    </>
  );
}
