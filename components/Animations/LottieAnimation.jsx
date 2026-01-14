import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

/**
 * LottieAnimation Component
 *
 * A wrapper around DotLottieReact to easily display Lottie animations.
 *
 * @param {Object} props
 * @param {string} props.src - Path to the animation file (e.g., '/animations/animation.json')
 * @param {boolean} [props.loop=true] - Whether the animation should loop
 * @param {boolean} [props.autoplay=true] - Whether the animation should verify
 * @param {string} [props.className] - Additional CSS classes
 * @param {object} [props.style] - Inline styles
 * @param {string} [props.width] - Width of the animation
 * @param {string} [props.height] - Height of the animation
 */
const LottieAnimation = ({
    src,
    loop = true,
    autoplay = true,
    className = '',
    style = {},
    width = '100%',
    height = '100%',
    ...props
}) => {
    // Dynamic render configuration for Desktop quality vs Mobile performance
    const [renderConfig, setRenderConfig] = React.useState({
        devicePixelRatio: 1,
    });

    React.useEffect(() => {
        let timeoutId;
        const updateQuality = () => {
            // Check if Desktop (lg breakpoint)
            if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                 // "Max" quality: Use native device pixel ratio, or at least 2.0 for sharpness
                 setRenderConfig({
                    devicePixelRatio: Math.max(window.devicePixelRatio || 2, 2)
                 });
            } else {
                 // Mobile/Standard: Default behavior (usually auto-scales down)
                 // Setting 1 or leaving undefined often lets the library choose
                 setRenderConfig({
                    devicePixelRatio: 1
                 });
            }
        };

        // Debounced version to reduce layout thrashing
        const debouncedUpdateQuality = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(updateQuality, 150);
        };

        // Initial check
        updateQuality();

        // Listen for resize with debouncing
        window.addEventListener('resize', debouncedUpdateQuality);
        return () => {
            window.removeEventListener('resize', debouncedUpdateQuality);
            clearTimeout(timeoutId);
        };
    }, []);

    return (
        <div className={className} style={{ width, height, ...style }}>
            <DotLottieReact
                src={src}
                loop={loop}
                autoplay={autoplay}
                renderConfig={renderConfig}
                {...props}
            />
        </div>
    );
};

export default LottieAnimation;
