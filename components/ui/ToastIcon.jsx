import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// Toast icons are small, so always render at high quality (min 2x for sharpness)
const getDevicePixelRatio = () => 
  typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 2, 2) : 2;

export function ToastIcon({ src, size = 32 }) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <DotLottieReact
        src={src}
        loop
        autoplay
        style={{ width: '100%', height: '100%' }}
        renderConfig={{ devicePixelRatio: getDevicePixelRatio() }}
      />
    </div>
  );
}
