import { useState, useEffect, useTransition, useRef } from 'react';

export default function OptimizedSlider({
  value,
  min,
  max,
  step = 1,
  onChange, // Parent's handler (heavy)
  onCommit, // onMouseUp / onTouchEnd
  name,
  className,
  trackColor = "rgba(255, 255, 255, 0.2)",
  filledColor = "var(--color-brand)",
  disabled = false,
  vibrate = true,
  title,
  ...props
}) {
  const [localValue, setLocalValue] = useState(value);
  const [isPending, startTransition] = useTransition();
  const lastVibrateRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef(null);
  const animationRef = useRef(null);
  const offsetRef = useRef(0);
  const localValueRef = useRef(localValue);

  // Sync ref with state
  useEffect(() => {
    localValueRef.current = localValue;
  }, [localValue]);

  // Sync local state if parent value changes externally
  useEffect(() => {
    // Only sync if:
    // 1. We are NOT dragging (user is not controlling it)
    // 2. We are NOT pending a transition (we are not waiting for our own updates to flush)
    // 3. The value actually changed (optimization)
    if (!isDragging && !isPending && value !== undefined && value !== localValue) {
      setLocalValue(value);
    }
  }, [value, isDragging, isPending, localValue]);

  // Initial Paint (Static)
  useEffect(() => {
    if (!isDragging) {
      updateBackground(localValue, false);
    }
  }, [localValue, min, max, filledColor, trackColor, isDragging]);

  // Animation Loop
  useEffect(() => {
    if (!isDragging) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = () => {
      // Speed of flow
      offsetRef.current += 2; // Move right for "flow" effect

      // Reset logic to prevent massive numbers (Pattern length is 160px)
      // We use modulo in the updating function effectively, but keeping offset bounded is good.
      if (offsetRef.current > 16000) offsetRef.current = 0;

      updateBackground(localValueRef.current, true);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDragging, min, max, filledColor, trackColor]); // Removed localValue to prevent restart

  const updateBackground = (currentVal, animating) => {
    if (!inputRef.current) return;

    let val = 0;
    if (max !== min) {
      val = ((currentVal - min) / (max - min)) * 100;
    }

    // Static State: Simple filled bar + track
    if (!animating) {
      inputRef.current.style.background = `linear-gradient(to right, ${filledColor} 0%, ${filledColor} ${val}%, ${trackColor} ${val}%, ${trackColor} 100%)`;
      inputRef.current.style.backgroundSize = "100% 100%";
      inputRef.current.style.backgroundPosition = "0 0";
      return;
    }

    // ANIMATING: Plasma Flow Effect
    // To ensure the pattern moves correctly within the clipped area (val%) without moving the clip area itself:
    // 1. We fix background-position at 0 0.
    // 2. We set background-size of the first layer (fill) to `${val}% 100%`.
    // 3. We animate the gradient stops themselves by adding the offset.

    const off = offsetRef.current % 160; // Pattern repeats every 160px

    const plasmaGradient = `repeating-linear-gradient(
      90deg,
      ${filledColor} ${0 + off}px,
      color-mix(in srgb, ${filledColor}, white 20%) ${40 + off}px,
      color-mix(in srgb, ${filledColor}, white 60%) ${80 + off}px,
      color-mix(in srgb, ${filledColor}, white 20%) ${120 + off}px,
      ${filledColor} ${160 + off}px
    )`;

    const trackGradient = `linear-gradient(${trackColor}, ${trackColor})`;

    inputRef.current.style.backgroundImage = `${plasmaGradient}, ${trackGradient}`;

    // Layer 1 (Plasma): width = val%, height = 100%
    // Layer 2 (Track): width = 100%, height = 100%
    inputRef.current.style.backgroundSize = `${val}% 100%, 100% 100%`;

    // Fix position at 0
    inputRef.current.style.backgroundPosition = `0 0, 0 0`;

    inputRef.current.style.backgroundRepeat = `no-repeat, no-repeat`;
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Throttled vibration
    if (vibrate && navigator.vibrate) {
        const now = Date.now();
        if (now - lastVibrateRef.current > 30) {
            navigator.vibrate(5);
            lastVibrateRef.current = now;
        }
    }

    startTransition(() => {
      const syntheticEvent = {
        target: { name, value: newValue, type: 'range', ...props },
        currentTarget: { name, value: newValue },
        preventDefault: () => {},
        stopPropagation: () => {}
      };
      if (onChange) onChange(syntheticEvent);
    });
  };

  return (
    <input
      ref={inputRef}
      type="range"
      min={min}
      max={max}
      step={step}
      name={name}
      value={localValue}
      onChange={handleChange}
      onMouseDown={(e) => {
          setIsDragging(true);
          // Don't reset offset to 0 to keep flow continuous or reset?
          // Resetting might feel jumpy if you click multiple times.
          // Let's NOT reset offsetRef.current = 0; allow continuous flow phase.
          if (props.onMouseDown) props.onMouseDown(e);
      }}
      onTouchStart={(e) => {
          setIsDragging(true);
          if (props.onTouchStart) props.onTouchStart(e);
      }}
      onMouseUp={(e) => {
        setIsDragging(false);
        if (onCommit) onCommit(e);
        if (props.onMouseUp) props.onMouseUp(e);
      }}
      onTouchEnd={(e) => {
        setIsDragging(false);
        if (onCommit) onCommit(e);
        if (props.onTouchEnd) props.onTouchEnd(e);
      }}
      className={className}
      title={title}
      disabled={disabled}
      {...props}
    />
  );
}
