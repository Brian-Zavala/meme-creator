import { useState, useEffect, useTransition, useRef, useId } from 'react';

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
  id,
  ...props
}) {
  const [localValue, setLocalValue] = useState(value);
  const [isPending, startTransition] = useTransition();
  const lastVibrateRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const generatedId = useId();
  const effectiveId = id || name || generatedId;

  const inputRef = useRef(null);
  const glowRef = useRef(null);
  const fillBaseRef = useRef(null);
  const fillPatternRef = useRef(null);

  const animationRef = useRef(null);
  const offsetRef = useRef(0);
  const localValueRef = useRef(localValue);

  // Consolidated: Sync ref and update visuals
  useEffect(() => {
    localValueRef.current = localValue;
    updateVisuals(localValue);
  }, [localValue, min, max, filledColor, trackColor]);

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

  // Animation Loop
  // We strictly manage the "Flow" (offset) and "Opacity" classes here.
  useEffect(() => {
    // If not dragging, ensure we clean up animation but state stays "static"
    // The CSS transitions on the elements handles the smooth fade out.
    if (!isDragging) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = () => {
      offsetRef.current += 3;
      if (offsetRef.current > 16000) offsetRef.current = 0;

      updateVisuals(localValueRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDragging, min, max, filledColor, trackColor]);

  const updateVisuals = (currentVal) => {
    let val = 0;
    if (max !== min) {
      val = ((currentVal - min) / (max - min)) * 100;
    }

    const off = offsetRef.current % 160;

    // --- Dynamic Styles ---
    // 1. Fill Widths
    if (fillBaseRef.current) fillBaseRef.current.style.width = `${val}%`;
    if (fillPatternRef.current) fillPatternRef.current.style.width = `${val}%`;
    if (glowRef.current) glowRef.current.style.width = `${val}%`;

    // 2. Pattern Position (Flow)
    const pos = `${offsetRef.current}px 0`;
    if (fillPatternRef.current) fillPatternRef.current.style.backgroundPosition = pos;
    if (glowRef.current) glowRef.current.style.backgroundPosition = pos;

    // 3. Pattern Definition (Color Mix)
    // We define this once or dynamic? It depends on filledColor prop.
    // It's effectively constant unless filledColor changes.
    // We can set it inline.
    const plasmaGradient = `repeating-linear-gradient(
      90deg,
      ${filledColor} ${0}px,
      color-mix(in srgb, ${filledColor}, white 15%) ${40}px,
      color-mix(in srgb, ${filledColor}, white 40%) ${80}px,
      color-mix(in srgb, ${filledColor}, white 15%) ${120}px,
      ${filledColor} ${160}px
    )`;

    if (fillPatternRef.current) fillPatternRef.current.style.backgroundImage = plasmaGradient;
    if (glowRef.current) glowRef.current.style.backgroundImage = plasmaGradient;
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
    <div className={`relative flex items-center group ${className || ''}`} style={{ isolate: 'isolate' }}>
      {/* --- VISUAL LAYERS (Pointer events none) --- */}

      {/* 1. Track Background (Full Width) */}
      <div
        className="absolute top-0 left-0 w-full h-full rounded-full pointer-events-none"
        style={{ background: trackColor }}
      />

      {/* 2. Glow Layer (Backing, Fades In) */}
      <div
        ref={glowRef}
        className={`absolute top-0 left-0 h-full rounded-full pointer-events-none transition-opacity duration-300 ease-out ${isDragging ? 'opacity-70' : 'opacity-0'}`}
        style={{
          zIndex: 0,
          filter: 'blur(8px)',
          backgroundSize: '160px 100%', // Pattern size
          backgroundRepeat: 'repeat-x'
        }}
      />

      {/* 3. Base Fill (Solid Color, Always Visible) */}
      <div
        ref={fillBaseRef}
        className="absolute top-0 left-0 h-full rounded-full pointer-events-none"
        style={{
            zIndex: 1,
            background: filledColor
        }}
      />

      {/* 4. Pattern Fill (Plasma, Fades In on Drag) */}
      <div
        ref={fillPatternRef}
        className={`absolute top-0 left-0 h-full rounded-full pointer-events-none transition-opacity duration-300 ease-out ${isDragging ? 'opacity-100' : 'opacity-0'}`}
        style={{
            zIndex: 2,
            backgroundSize: '160px 100%', // Pattern size
            backgroundRepeat: 'repeat-x'
        }}
      />

      {/* --- INTERACTION LAYER (Input) --- */}
      <input
        ref={inputRef}
        id={effectiveId}
        type="range"
        min={min}
        max={max}
        step={step}
        name={name}
        value={localValue}
        onChange={handleChange}
        onMouseDown={(e) => {
            setIsDragging(true);
            // offsetRef.current = 0; // Keep flow continuous
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
        // Input is transparent, just providing the thumb and interaction area
        className="w-full h-full opacity-100 cursor-pointer touch-none bg-transparent appearance-none focus:outline-none range-slider relative z-10"
        style={{ touchAction: 'none' }}
        title={title}
        disabled={disabled}
        {...props}
      />
    </div>
  );
}
