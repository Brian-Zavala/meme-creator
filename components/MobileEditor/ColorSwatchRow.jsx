import { useRef } from "react";

const PRESET_COLORS = [
  "#ffffff", "#000000", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#3b82f6", "#a855f7",
];

/**
 * ColorSwatchRow
 *
 * Props:
 *   name            – style key to emit
 *   value           – current color value
 *   onChange        – (syntheticEvent, commit) => void
 *   allowRemove     – show a red ✕ "remove / clear" button as the first swatch
 *   removeValue     – value to emit when remove is clicked (default: "transparent")
 */
export default function ColorSwatchRow({
  name,
  value,
  onChange,
  allowRemove = false,
  removeValue = "transparent",
}) {
  const colorInputRef = useRef(null);

  const safeHex = (c) => {
    if (!c || c === "transparent" || c === "") return "#000000";
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

  // ✕ is "active" (outlined) when value is truly off — empty or transparent.
  // We intentionally exclude real hex reset values (e.g. #ffffff) to avoid false highlight.
  const isRemoved = !value || value === "" || value === "transparent";

  return (
    <div className="flex items-center gap-2 w-full overflow-x-auto h-full px-2 scrollbar-none">
      {/* Remove / clear button */}
      {allowRemove && (
        <button
          type="button"
          onClick={() => handlePreset(removeValue)}
          className="color-remove-dot"
          data-active={isRemoved || undefined}
          aria-label="Remove color"
          title="Remove / clear style"
        >
          ✕
        </button>
      )}

      {PRESET_COLORS.map((color) => {
        const isActive = !isRemoved && safeHex(value) === color;
        return (
          <button
            key={color}
            type="button"
            onClick={() => handlePreset(color)}
            className="draw-color-dot shrink-0"
            style={{
              background: color,
              borderColor: isActive ? "white" : "transparent",
              outline: isActive ? "2px solid white" : "none",
            }}
            aria-label={color}
          />
        );
      })}

      {/* Custom color picker */}
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
