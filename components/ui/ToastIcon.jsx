import React, { useState, useEffect, useMemo } from 'react';

// NOTE: No React.lazy + Suspense here — see LottieAnimation.jsx for the full explanation.
// ToastIcon is rendered inside react-hot-toast portals, which are outside the Main component's
// Suspense boundaries. Using React.lazy here caused the entire page to flash on first toast.

const getDevicePixelRatio = () =>
  typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 2, 2) : 2;

// Module-level cache so all ToastIcon instances share a single import
let _DotLottieReact = null;
let _importPromise = null;

function loadDotLottie() {
  if (_DotLottieReact) return Promise.resolve(_DotLottieReact);
  if (!_importPromise) {
    _importPromise = import('@lottiefiles/dotlottie-react').then(module => {
      _DotLottieReact = module.DotLottieReact;
      return _DotLottieReact;
    });
  }
  return _importPromise;
}

export function ToastIcon({ src, size = 32 }) {
  const [Component, setComponent] = useState(() => _DotLottieReact);

  useEffect(() => {
    if (!Component) {
      loadDotLottie().then(C => setComponent(() => C)).catch(() => {});
    }
  }, [Component]);

  const renderConfig = useMemo(() => ({
    devicePixelRatio: getDevicePixelRatio(),
    freezeOnOffscreen: true,
  }), []);

  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {Component ? (
        <Component
          src={src}
          loop
          autoplay
          style={{ width: '100%', height: '100%' }}
          renderConfig={renderConfig}
        />
      ) : (
        <div style={{ width: size, height: size }} />
      )}
    </div>
  );
}
