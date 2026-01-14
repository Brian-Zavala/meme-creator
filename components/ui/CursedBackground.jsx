import LottieAnimation from '../Animations/LottieAnimation';

/**
 * Cursed Background - Dark void with glowing eyes
 */
export default function CursedBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-gradient-to-br from-purple-950 via-black to-indigo-950 flex items-center justify-center">
            <LottieAnimation
                src="/animations/cursed.json"
                className="w-full h-full opacity-90"
                style={{ width: '100%', height: '100%', transform: 'scale(1.2)' }}
            />
        </div>
    );
}
