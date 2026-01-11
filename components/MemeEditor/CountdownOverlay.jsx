import React from 'react';

const CountdownOverlay = ({ x, y, progress }) => {
  // Calculate specific countdown number (3 -> 2 -> 1)
  // Progress goes from 0 to 1
  const count = Math.ceil(3 * (1 - progress));

  // Ensure we don't show 0 or negative numbers if progress hits 1 slightly early
  const displayCount = count < 1 ? 1 : count;

  return (
    <div
      data-html2canvas-ignore="true"
      className="absolute z-50 pointer-events-none flex flex-col items-center justify-center pointer-events-none select-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -100%) translateY(-20px)', // shift up to be above finger
      }}
    >
      {/* "Creating Text..." Label */}
      <div
        className="mb-2 whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-lg backdrop-blur-md shadow-lg animate-in fade-in zoom-in duration-200"
        style={{
            background: 'oklch(15% 0.02 39 / 0.95)',
            color: 'oklch(53% 0.187 39)',
            border: '1px solid oklch(53% 0.187 39 / 0.3)'
        }}
      >
        Creating Text...
      </div>

      {/* Countdown Number Window */}
      <div
        className="relative w-24 h-24 flex items-center justify-center"
      >
        {/* Pulsing Background/Window */}
         <div
            className="absolute inset-0 rounded-2xl bg-black/40 backdrop-blur-xl border-2 border-brand/30 shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-pulse"
            style={{
                borderColor: 'oklch(53% 0.187 39 / 0.5)',
                animationDuration: '600ms' // Faster pulse to match rapid countdown
            }}
         />

         {/* The Number */}
         <span
            className="text-6xl font-black italic relative z-10"
            style={{
                color: 'oklch(53% 0.187 39)',
                textShadow: '0 4px 12px rgba(0,0,0,0.5)',
                fontFamily: 'Impact, sans-serif' // Keeping with meme theme
            }}
         >
            {displayCount}
         </span>
      </div>
    </div>
  );
};

export default CountdownOverlay;
