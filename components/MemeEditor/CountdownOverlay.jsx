import { useEffect, useRef, useState } from 'react';

/**
 * Self-animating countdown overlay — drives its own countdown via rAF
 * instead of receiving progress via parent state updates (eliminates ~34 re-renders).
 * Parent only sets/clears the overlay (2 state changes total).
 */
const CountdownOverlay = ({ x, y, duration = 1700 }) => {
  const [count, setCount] = useState(3);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    let rafId;

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const newCount = Math.max(1, Math.ceil(3 * (1 - progress)));
      setCount(prev => prev !== newCount ? newCount : prev);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [duration]);

  return (
    <div
      data-html2canvas-ignore="true"
      className="absolute z-50 pointer-events-none flex flex-col items-center justify-center select-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -100%) translateY(-20px)',
      }}
    >
      {/* "Creating Text..." Label */}
      <div
        className="mb-2 whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg animate-in fade-in zoom-in duration-200"
        style={{
            background: 'oklch(15% 0.02 39 / 0.95)',
            color: 'oklch(53% 0.187 39)',
            border: '1px solid oklch(53% 0.187 39 / 0.3)'
        }}
      >
        Creating Text...
      </div>

      {/* Countdown Number Window */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Pulsing Background */}
         <div
            className="absolute inset-0 rounded-2xl bg-black/40 backdrop-blur-xl border-2 border-brand/30 shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-pulse"
            style={{
                borderColor: 'oklch(53% 0.187 39 / 0.5)',
                animationDuration: '600ms'
            }}
         />

         {/* The Number */}
         <span
            className="text-6xl font-black italic relative z-10"
            style={{
                color: 'oklch(53% 0.187 39)',
                textShadow: '0 4px 12px rgba(0,0,0,0.5)',
                fontFamily: 'Impact, sans-serif'
            }}
         >
            {count}
         </span>
      </div>
    </div>
  );
};

export default CountdownOverlay;
