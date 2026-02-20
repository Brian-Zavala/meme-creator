import { useRef, useState } from "react";
import { Pen, Eraser, Trash2, Square, Circle, Triangle, Hand, MousePointer2, PaintBucket } from "lucide-react";
import ToolPill from "../ToolPill";
import { SHAPES } from "../../../utils/shapeConstants.js";

const DRAW_TOOLS = [
  { id: "pen",    label: "Pen",    Icon: Pen },
  { id: "eraser", label: "Eraser", Icon: Eraser },
  { id: "move",   label: "Move",   Icon: Hand },
  // { id: "edit",   label: "Edit",   Icon: MousePointer2 },
];

const COLORS = [
  "#ffffff", "#000000", "#ef4444", "#3b82f6",
  "#eab308", "#22c55e", "#a855f7",
];

export default function DrawToolRow({ activeTool, onToolTap, canvasActiveTool, drawColor, onClearDrawings, shapeStroke, shapeFill, selectedShapeId }) {
  const colorInputRef = useRef(null);
  const [isFillMode, setIsFillMode] = useState(false);

  const isShapeActive = canvasActiveTool?.startsWith('shape-') || selectedShapeId;

  const handleColorTap = (color) => {
    if (isShapeActive) {
      if (isFillMode) {
        onToolTap(`shapeFill-${color}`);
      } else {
        onToolTap(`shapeStroke-${color}`);
      }
    } else {
      onToolTap(`color-${color}`);
    }
  };

  const getActiveColor = () => {
    if (isShapeActive) {
      return isFillMode ? (shapeFill || "transparent") : (shapeStroke || "#ff0000");
    }
    return drawColor || "#ff0000";
  };

  const activeColor = getActiveColor();

  return (
    <>
      {DRAW_TOOLS.map(({ id, label, Icon }) => (
        <ToolPill
          key={id}
          icon={<Icon className="w-4 h-4" />}
          label={label}
          isActive={id === 'edit' ? !canvasActiveTool : canvasActiveTool === id}
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

      {/* Shape Fill Toggle (Only visible when shape is active) */}
      {isShapeActive && (
        <>
          <button
            type="button"
            onClick={() => {
              const nextMode = !isFillMode;
              setIsFillMode(nextMode);
              // UX Improvement: If switching to Fill mode and no fill is set, auto-set it to stroke color
              if (nextMode && (!shapeFill || shapeFill === 'transparent')) {
                const defaultFill = shapeStroke || '#ef4444';
                onToolTap(`shapeFill-${defaultFill}`);
              }
            }}
            className={`tool-pill border transition-all duration-300 ${
              isFillMode
                ? '!bg-red-500/20 !border-red-500 !text-red-400 hover:!bg-red-500/30'
                : '!bg-green-500/20 !border-green-500 !text-green-400 hover:!bg-green-500/30'
            }`}
            title={isFillMode ? "Editing Fill Color" : "Editing Stroke Color"}
          >
            <PaintBucket className={`w-4 h-4 transition-transform duration-300 ${isFillMode ? 'rotate-12 scale-110' : ''}`} />
            <span className="text-xs font-bold uppercase tracking-wider min-w-[40px] text-center">
              {isFillMode ? "Fill" : "Stroke"}
            </span>
          </button>

          <div className="w-px h-6 bg-[#2f3336] flex-shrink-0 mx-1" />
        </>
      )}

      {/* Consolidated Color dots */}
      <button
        type="button"
        onClick={() => handleColorTap("transparent")}
        className="color-remove-dot flex-shrink-0"
        data-active={activeColor === "transparent" || !activeColor ? true : undefined}
        aria-label="No Color (Transparent)"
        title="No Color"
      >
        ✕
      </button>

      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => handleColorTap(color)}
          className="draw-color-dot flex-shrink-0"
          style={{
            backgroundColor: color,
            borderColor: activeColor === color ? "white" : "transparent",
            outline: activeColor === color ? "2px solid white" : "none",
          }}
          aria-label={`Color ${color}`}
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
        defaultValue={activeColor === "transparent" ? "#ff0000" : activeColor}
        onChange={(e) => handleColorTap(e.target.value)}
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
