import { ArrowCounterClockwise } from "@phosphor-icons/react";
import OptimizedSlider from "../ui/OptimizedSlider";

export default function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  name,
  defaultValue,
  onChange,
  onCommit,
  filledColor = "var(--color-brand)",
}) {
  const handleReset = () => {
    onChange({ currentTarget: { name, value: defaultValue } });
    onCommit?.();
  };

  const displayValue = typeof value === "number"
    ? (Number.isInteger(value) ? value : Number(value).toFixed(1))
    : Math.round(value ?? defaultValue ?? 0);

  return (
    <div className="flex items-center gap-3 w-full px-2">
      {label && (
        <span className="text-[11px] text-slate-400 shrink-0 w-14 text-right leading-none">
          {label}
        </span>
      )}
      <OptimizedSlider
        value={value ?? defaultValue ?? 0}
        min={min}
        max={max}
        step={step}
        name={name}
        onChange={onChange}
        onCommit={onCommit}
        filledColor={filledColor}
        className="h-2 flex-1 rounded-full"
      />
      <span className="text-xs font-mono text-slate-300 w-8 text-center shrink-0 tabular-nums">
        {displayValue}
      </span>
      {defaultValue !== undefined && (
        <button
          type="button"
          onClick={handleReset}
          disabled={Number(value) === Number(defaultValue)}
          className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-all duration-200 ease-out ${
            Number(value) !== Number(defaultValue)
              ? "opacity-100 scale-100 text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20 pointer-events-auto"
              : "opacity-0 scale-75 pointer-events-none"
          }`}
          aria-label="Reset to default"
          tabIndex={Number(value) !== Number(defaultValue) ? 0 : -1}
        >
          <ArrowCounterClockwise size={14} />
        </button>
      )}
    </div>
  );
}
