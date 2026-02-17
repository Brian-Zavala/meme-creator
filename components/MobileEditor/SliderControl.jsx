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
      {defaultValue !== undefined && Number(value) !== Number(defaultValue) && (
        <button
          type="button"
          onClick={handleReset}
          className="text-slate-500 hover:text-white text-sm shrink-0 leading-none"
          aria-label="Reset to default"
        >
          ↺
        </button>
      )}
    </div>
  );
}
