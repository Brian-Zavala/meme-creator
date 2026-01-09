import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export function ToastIcon({ src, size = 32 }) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <DotLottieReact
        src={src}
        loop
        autoplay
        width={size}
        height={size}
      />
    </div>
  );
}
