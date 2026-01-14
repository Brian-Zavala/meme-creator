import LottieAnimation from '../Animations/LottieAnimation';

/**
 * Stickerfy Background - Floating sticker particles
 */
export default function StickerfyBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center">
            <LottieAnimation
                src="/animations/stickerfy.json"
                className="w-full h-full opacity-90"
                style={{ width: '100%', height: '100%', transform: 'scale(1.2)' }}
            />
        </div>
    );
}
