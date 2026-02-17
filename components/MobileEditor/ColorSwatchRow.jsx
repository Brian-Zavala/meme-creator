import { useRef } from "react";

const PRESET_COLORS = [
  "#ffffff", "#000000", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#3b82f6", "#a855f7",
];

export default function ColorSwatchRow({ name, value, onChange, allowTransparent = false }) {
  const colorInputRef = useRef(null);

  const safeHex = (c) => {
    if (!c || c === "transparent") return "#000000";
    return c.startsWith("#") ? c.substring(0, 7) : "#000000";
  };

  const handlePreset = (color) => {
    onChange({ currentTarget: { name, value: color } }, true);
  };

  const handleNativePick = (e) => {
    onChange({ currentTarget: { name, value: e.target.value } }, false);
  };

  const handleNativeCommit = (e) => {
    onChange({ currentTarget: { name, value: e.target.value } }, true);
  };

  const colors = allowTransparent ? ["transparent", ...PRESET_COLORS] : PRESET_COLORS;

  return (
    <div className="flex items-center gap-2 w-full overflow-x-auto h-full px-2 scrollbar-none">
      {colors.map((color) => {
        const isActive = color === "transparent"
          ? value === "transparent" || !value
          : safeHex(value) === color;

        return (
          <button
            key={color}
            type="button"
            onClick={() => handlePreset(color)}
            className="draw-color-dot shrink-0"
            style={{
              background: color === "transparent"
                ? "repeating-linear-gradient(45deg,#555 0px,#555 5px,#333 5px,#333 10px)"
                : color,
              borderColor: isActive ? "white" : "transparent",
              outline: isActive ? "2px solid white" : "none",
            }}
            aria-label={color === "transparent" ? "Transparent" : color}
          />
        );
      })}

      {/* Custom color picker — input fixed at center-bottom so picker opens in viewport */}
      <button
        type="button"
        onClick={() => colorInputRef.current?.click()}
        className="draw-color-dot shrink-0 overflow-hidden"
        style={{ background: "linear-gradient(135deg,#f00 0%,#ff0 25%,#0f0 50%,#0ff 75%,#00f 100%)" }}
        aria-label="Custom color"
      />
      <input
        ref={colorInputRef}
        type="color"
        value={safeHex(value)}
        onChange={handleNativePick}
        onBlur={handleNativeCommit}
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
    </div>
  );
}
