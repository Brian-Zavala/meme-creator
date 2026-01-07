import LottieAnimation from '../Animations/LottieAnimation';

/**
 * Style Shuffle Background - Uses Lottie animation
 */
export default function StyleShuffleBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
            <LottieAnimation
                src="/animations/style-shuffle.json"
                className="w-full h-full object-cover opacity-80"
                style={{ width: '100%', height: '100%', transform: 'scale(1.75)' }}
            />
        </div>
    );
}
