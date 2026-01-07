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
    return (
        <div className={className} style={{ width, height, ...style }}>
            <DotLottieReact
                src={src}
                loop={loop}
                autoplay={autoplay}
                {...props}
            />
        </div>
    );
};

export default LottieAnimation;
