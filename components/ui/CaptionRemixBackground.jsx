import LottieAnimation from '../Animations/LottieAnimation';

/**
 * Caption Remix Background - Uses Lottie animation
 */
export default function CaptionRemixBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-purple-600 flex items-center justify-center">
            <LottieAnimation
                src="/animations/caption-remix.json"
                className="w-full h-full object-cover opacity-80"
                style={{ width: '100%', height: '100%', transform: 'scale(1.75)' }}
            />
        </div>
    );
}
