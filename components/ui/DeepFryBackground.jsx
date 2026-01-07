import LottieAnimation from '../Animations/LottieAnimation';

/**
 * Deep Fry Background - Uses Lottie animation
 */
export default function DeepFryBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-red-600 flex items-center justify-center">
            <LottieAnimation
                src="/animations/extreme-deep-fry.json"
                className="w-full h-full object-cover opacity-90"
                style={{ width: '100%', height: '100%', transform: 'scale(1.65)' }}
            />
        </div>
    );
}
