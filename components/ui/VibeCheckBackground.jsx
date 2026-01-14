import LottieAnimation from '../Animations/LottieAnimation';

/**
 * Vibe Check Background - Uses Lottie animation
 */
export default function VibeCheckBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-indigo-500 flex items-center justify-center">
            <LottieAnimation
                src="/animations/vibe-check.json"
                className="w-full h-full object-cover opacity-80"
                style={{ width: '100%', height: '100%', transform: 'scale(1.35)' }}
            />
        </div>
    );
}
