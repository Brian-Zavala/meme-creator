/**
 * Text Animation Presets for Meme Creator
 * Each animation defines a function to calculate per-frame transforms
 */

export const TEXT_ANIMATIONS = [
    {
        id: 'none',
        name: 'None',
        icon: '✖️',
        // No animation
        getTransform: () => ({ offsetX: 0, offsetY: 0, rotation: 0, scale: 1, opacity: 1 }),
    },
    {
        id: 'wave',
        name: 'Wave',
        icon: '🌊',
        // Oscillating sine wave - each character offset slightly
        getTransform: (frameIndex, totalFrames, charIndex = 0) => {
            const progress = (frameIndex / totalFrames) * Math.PI * 2;
            const charOffset = charIndex * 0.5; // Phase offset per character
            return {
                offsetX: 0,
                offsetY: Math.sin(progress + charOffset) * 8,
                rotation: 0,
                scale: 1,
                opacity: 1,
            };
        },
    },
    {
        id: 'bounce',
        name: 'Bounce',
        icon: '⚡',
        // Bouncing with physics-like easing
        getTransform: (frameIndex, totalFrames) => {
            const t = (frameIndex / totalFrames) % 1;
            // Simple bounce: parabola that repeats
            const bounce = Math.abs(Math.sin(t * Math.PI * 2)) * 12;
            return {
                offsetX: 0,
                offsetY: -bounce,
                rotation: 0,
                scale: 1 + (bounce / 60), // Slight squash stretch
                opacity: 1,
            };
        },
    },
    {
        id: 'shake',
        name: 'Shake',
        icon: '💥',
        // Random tremor effect - chaotic and intense
        getTransform: (frameIndex) => {
            // Use frame index as seed for pseudo-random but deterministic shake
            const seed = frameIndex * 12345;
            const randX = ((seed % 17) - 8);
            const randY = ((seed % 13) - 6);
            const randRot = ((seed % 11) - 5) * 0.5;
            return {
                offsetX: randX,
                offsetY: randY,
                rotation: randRot,
                scale: 1,
                opacity: 1,
            };
        },
    },
    {
        id: 'glitch',
        name: 'Glitch',
        icon: '📺',
        // Horizontal jitter with occasional large shifts
        getTransform: (frameIndex, totalFrames) => {
            const t = frameIndex / totalFrames;
            // Random-ish based on frame
            const glitchIntensity = (frameIndex % 5 === 0) ? 15 : (frameIndex % 3 === 0) ? 5 : 0;
            const direction = (frameIndex % 2 === 0) ? 1 : -1;
            return {
                offsetX: glitchIntensity * direction,
                offsetY: (frameIndex % 7 === 0) ? 3 : 0,
                rotation: 0,
                scale: 1,
                opacity: (frameIndex % 8 === 0) ? 0.7 : 1,
            };
        },
    },
    {
        id: 'pulse',
        name: 'Pulse',
        icon: '💓',
        // Scale pulsing effect
        getTransform: (frameIndex, totalFrames) => {
            const progress = (frameIndex / totalFrames) * Math.PI * 2;
            const pulseScale = 1 + Math.sin(progress) * 0.15;
            return {
                offsetX: 0,
                offsetY: 0,
                rotation: 0,
                scale: pulseScale,
                opacity: 1,
            };
        },
    },
    {
        id: 'float',
        name: 'Float',
        icon: '☁️',
        // Gentle floating up and down
        getTransform: (frameIndex, totalFrames) => {
            const progress = (frameIndex / totalFrames) * Math.PI * 2;
            return {
                offsetX: Math.sin(progress * 0.5) * 3,
                offsetY: Math.sin(progress) * 6,
                rotation: Math.sin(progress) * 2,
                scale: 1,
                opacity: 1,
            };
        },
    },
    {
        id: 'spin',
        name: 'Spin',
        icon: '🔄',
        // Full 360° rotation over the loop
        getTransform: (frameIndex, totalFrames) => {
            const progress = frameIndex / totalFrames;
            return {
                offsetX: 0,
                offsetY: 0,
                rotation: progress * 360,
                scale: 1,
                opacity: 1,
            };
        },
    },
];

/**
 * Get animation preset by ID
 */
export function getAnimationById(id) {
    return TEXT_ANIMATIONS.find(a => a.id === id) || TEXT_ANIMATIONS[0];
}

/**
 * Check if any text has an animation enabled
 */
export function hasAnimatedText(texts) {
    return texts.some(t => t.animation && t.animation !== 'none');
}

/**
 * Default frame count for animated text on static images
 */
export const ANIMATED_TEXT_FRAMES = 24;

/**
 * Default delay for animated text frames (in centiseconds for GIF)
 */
export const ANIMATED_TEXT_DELAY = 4; // 40ms = 25fps
