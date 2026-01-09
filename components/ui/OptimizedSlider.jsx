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
  ...props
}) {
  const [localValue, setLocalValue] = useState(value);
  const [isPending, startTransition] = useTransition();
  const lastVibrateRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // Sync local state if parent value changes externally (e.g. Reset button)
  useEffect(() => {
    if (!isDragging && value !== undefined) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

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
      // Create a synthetic event compatible with standard React event handlers
      const syntheticEvent = {
        target: {
          name,
          value: newValue,
          type: 'range',
          ...props // pass through any other props that might be expected
        },
        currentTarget: {
            name,
            value: newValue
        },
        // Prevent default methods to avoid crashing if parent calls them
        preventDefault: () => {},
        stopPropagation: () => {}
      };
      
      if (onChange) {
          onChange(syntheticEvent);
      }
    });
  };

  const getBackgroundStyle = () => {
    // Handle edge case where max === min to avoid division by zero
    if (max === min) return { background: trackColor };
    
    const val = ((localValue - min) / (max - min)) * 100;
    return {
      background: `linear-gradient(to right, ${filledColor} 0%, ${filledColor} ${val}%, ${trackColor} ${val}%, ${trackColor} 100%)`
    };
  };

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      name={name}
      value={localValue}
      onChange={handleChange}
      onMouseDown={(e) => {
          setIsDragging(true);
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
      style={{ ...getBackgroundStyle(), ...(props.style || {}) }}
      disabled={disabled}
      {...props}
    />
  );
}
