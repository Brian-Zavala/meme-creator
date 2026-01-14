import LottieAnimation from '../Animations/LottieAnimation';

/**
 * Time Warp Background - Distortion/ripple effect
 */
export default function TimeWarpBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-700 flex items-center justify-center">
            <LottieAnimation
                src="/animations/time-warp.json"
                className="w-full h-full opacity-90"
                style={{ width: '100%', height: '100%', transform: 'scale(1.2)' }}
            />
        </div>
    );
}
