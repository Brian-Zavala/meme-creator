import React, { Suspense } from 'react';

// Use Worker variant for toast icons too -- keeps main thread clean
const LazyDotLottieWorker = React.lazy(() =>
    import('@lottiefiles/dotlottie-react').then(module => ({
        default: module.DotLottieWorkerReact
    }))
);

const getDevicePixelRatio = () =>
  typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 2, 2) : 2;

/**
 * Convert relative URLs to absolute for Web Worker compatibility.
 */
function toAbsoluteUrl(src) {
    if (!src) return src;
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('blob:')) {
        return src;
    }
    try {
        return new URL(src, window.location.origin).href;
    } catch {
        return src;
    }
}

export function ToastIcon({ src, size = 32 }) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Suspense fallback={<div style={{ width: size, height: size }} />}>
        <LazyDotLottieWorker
          src={toAbsoluteUrl(src)}
          loop
          autoplay
          workerId="toast-lottie-worker"
          style={{ width: '100%', height: '100%' }}
          renderConfig={{ devicePixelRatio: getDevicePixelRatio(), freezeOnOffscreen: true }}
        />
      </Suspense>
    </div>
  );
}
