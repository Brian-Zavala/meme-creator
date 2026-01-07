import LottieAnimation from '../Animations/LottieAnimation';

/**
 * Filter Frenzy Background - Uses Lottie animation
 */
export default function FilterFrenzyBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-cyan-500 flex items-center justify-center">
            <LottieAnimation
                src="/animations/filter-frenzy.json"
                className="w-full h-full object-cover opacity-80"
                style={{ width: '100%', height: '100%', transform: 'scale(1.20)' }}
            />
        </div>
    );
}
