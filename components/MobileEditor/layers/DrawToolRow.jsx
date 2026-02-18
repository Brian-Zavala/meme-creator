import { useRef } from "react";
import { Pen, Eraser, Trash2, Square, Circle, Triangle } from "lucide-react";
import ToolPill from "../ToolPill";
import { SHAPES } from "../../../utils/shapeConstants.js";

const DRAW_TOOLS = [
  { id: "pen",    label: "Pen",    Icon: Pen },
  { id: "eraser", label: "Eraser", Icon: Eraser },
];

const COLORS = [
  "#ffffff", "#000000", "#ef4444", "#3b82f6",
  "#eab308", "#22c55e", "#a855f7",
];

export default function DrawToolRow({ activeTool, onToolTap, canvasActiveTool, drawColor, onClearDrawings, shapeStroke, shapeFill }) {
  const colorInputRef = useRef(null);

  return (
    <>
      {DRAW_TOOLS.map(({ id, label, Icon }) => (
        <ToolPill
          key={id}
          icon={<Icon className="w-4 h-4" />}
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
        <Trash2 className="w-4 h-4" />
        <span>Clear</span>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-[#2f3336] flex-shrink-0 mx-1" />

      {/* Shape Tools (first 4 shapes inline) */}
      {SHAPES.slice(0, 4).map(shape => (
        <ToolPill
          key={`shape-${shape.id}`}
          icon={<span className="text-base">{shape.icon}</span>}
          label={shape.label}
          isActive={canvasActiveTool === `shape-${shape.id}`}
          onClick={() => onToolTap(`shape-${shape.id}`)}
        />
      ))}

      {/* More Shapes Button (remaining 6 shapes) */}
      <ToolPill
        icon={<span className="text-base">⋯</span>}
        label="More"
        isActive={canvasActiveTool?.startsWith('shape-') && !canvasActiveTool.match(/shape-(rectangle|circle|triangle|line)/)}
        onClick={() => onToolTap('shape-menu')}
      />

      {/* Divider */}
      <div className="w-px h-6 bg-[#2f3336] flex-shrink-0 mx-1" />

      {/* Shape-specific Stroke Color dots (only when shape tool active) */}
      {canvasActiveTool?.startsWith('shape-') && (
        <>
          {COLORS.map((color) => (
            <button
              key={`stroke-${color}`}
              type="button"
              onClick={() => onToolTap(`shapeStroke-${color}`)}
              className="draw-color-dot flex-shrink-0"
              style={{
                backgroundColor: color,
                borderColor: (shapeStroke || "#ff0000") === color ? "white" : "transparent",
                outline: (shapeStroke || "#ff0000") === color ? "2px solid white" : "none",
              }}
              aria-label={`Stroke color ${color}`}
            />
          ))}

          {/* Divider */}
          <div className="w-px h-6 bg-[#2f3336] flex-shrink-0 mx-1" />
        </>
      )}

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

      {/* Custom color picker — input fixed at center-bottom so picker opens in viewport */}
      <button
        type="button"
        onClick={() => colorInputRef.current?.click()}
        className="draw-color-dot flex-shrink-0 flex items-center justify-center bg-[#181818] border border-[#2f3336] text-slate-400 text-xs font-bold"
        aria-label="Custom color"
      >
        +
      </button>
      <input
        ref={colorInputRef}
        type="color"
        defaultValue={drawColor || "#ff0000"}
        onChange={(e) => onToolTap(`color-${e.target.value}`)}
        style={{
          position: "fixed",
          bottom: "200px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />
    </>
  );
}
