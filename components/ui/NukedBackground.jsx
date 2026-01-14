import LottieAnimation from '../Animations/LottieAnimation';

/**
 * Nuked Background - Extreme compression artifacts effect
 */
export default function NukedBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-gradient-to-br from-orange-600 via-red-600 to-black flex items-center justify-center">
            <LottieAnimation
                src="/animations/nuclear.json"
                className="w-full h-full opacity-90"
                style={{ width: '100%', height: '100%', transform: 'scale(1.2)' }}
            />
        </div>
    );
}
