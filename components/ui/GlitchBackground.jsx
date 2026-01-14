import LottieAnimation from '../Animations/LottieAnimation';

/**
 * Glitch Background - RGB channel split / chromatic aberration
 */
export default function GlitchBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-black flex items-center justify-center">
            <LottieAnimation
                src="/animations/glitch.json"
                className="w-full h-full opacity-90"
                style={{ width: '100%', height: '100%', transform: 'scale(1.1)' }}
            />
        </div>
    );
}
