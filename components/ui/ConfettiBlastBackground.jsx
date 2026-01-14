import LottieAnimation from '../Animations/LottieAnimation';

/**
 * Confetti Blast Background - Particle explosion effect
 */
export default function ConfettiBlastBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center">
            <LottieAnimation
                src="/animations/confetti.json"
                className="w-full h-full opacity-90"
                style={{ width: '100%', height: '100%', transform: 'scale(1.4)' }}
            />
        </div>
    );
}
