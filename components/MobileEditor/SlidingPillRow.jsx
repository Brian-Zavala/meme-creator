import { useRef, useLayoutEffect, useState } from "react";

/**
 * Wraps a horizontal row of .tool-pill buttons with a sliding background
 * capsule indicator. The active pill (data-active attribute present) gets a
 * floating background that CSS-transitions smoothly between pills.
 *
 * Props:
 *   activeId  – changes when the active tool changes; triggers re-measurement.
 *   className – extra classes on the wrapper div (e.g. overflow-x-auto).
 *   children  – pill buttons to render inside.
 */
export default function SlidingPillRow({ activeId, className = "", children }) {
  const containerRef = useRef(null);
  const [indicator, setIndicator] = useState(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const active = container.querySelector("[data-active]");
    if (!active) {
      setIndicator(null);
      return;
    }
    setIndicator({
      left:   active.offsetLeft,
      top:    active.offsetTop,
      width:  active.offsetWidth,
      height: active.offsetHeight,
    });
  }, [activeId]);

  return (
    <div ref={containerRef} className={`sliding-pill-row ${className}`}>
      {indicator && (
        <span
          className="sliding-pill-indicator"
          style={{
            left:   indicator.left,
            top:    indicator.top,
            width:  indicator.width,
            height: indicator.height,
          }}
        />
      )}
      {children}
    </div>
  );
}
