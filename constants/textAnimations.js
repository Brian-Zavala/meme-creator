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
        icon: '/images/stickers/wave.png',
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
        icon: '/images/stickers/bounce.svg',
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
        icon: '/images/stickers/shake.png',
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
        icon: '/images/stickers/glitch.png',
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
        icon: '/images/stickers/pulse.svg',
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
        icon: '/images/stickers/float.png',
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
        icon: '/images/stickers/spin.png',
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
    {
        id: 'tada',
        name: 'Tada',
        icon: '/images/stickers/tada.png',
        // Scale up and wiggle
        getTransform: (frameIndex, totalFrames) => {
            const t = (frameIndex / totalFrames) * Math.PI * 2; // 0 to 2PI
            // Wiggle: fast sine wave
            const wiggle = Math.sin(t * 3) * (Math.sin(t) > 0 ? 10 : 0); // Wiggle mostly during "up" phase
            // Scale: pulse up once
            const scale = 1 + (Math.sin(t) > 0 ? Math.sin(t) * 0.2 : 0);
            return {
                offsetX: 0,
                offsetY: 0,
                rotation: wiggle,
                scale: scale,
                opacity: 1,
            };
        },
    },
    {
        id: 'wobble',
        name: 'Wobble',
        icon: '/images/stickers/wobble.png',
        // Swaying back and forth combined with rotation
        getTransform: (frameIndex, totalFrames) => {
            const t = (frameIndex / totalFrames) * Math.PI * 2;
            const x = Math.sin(t) * 10;
            const rot = Math.sin(t) * 5;
            return {
                offsetX: x,
                offsetY: 0,
                rotation: rot,
                scale: 1,
                opacity: 1,
            };
        },
    },
    {
        id: 'heartbeat',
        name: 'Heartbeat',
        icon: '/images/stickers/heartbeat.png',
        // Iconic double-pulse
        getTransform: (frameIndex, totalFrames) => {
            const t = (frameIndex / totalFrames); // 0 to 1
            // Heartbeat mathematical approximation
            // Two rapid pulses per cycle
            let scale = 1;
            if (t < 0.15) scale = 1 + Math.sin(t * (Math.PI / 0.15)) * 0.15;
            else if (t > 0.2 && t < 0.45) scale = 1 + Math.sin((t - 0.2) * (Math.PI / 0.25)) * 0.2;

            return {
                offsetX: 0,
                offsetY: 0,
                rotation: 0,
                scale: scale,
                opacity: 1,
            };
        },
    },
    {
        id: 'flip',
        name: 'Flip',
        icon: '/images/stickers/flip.png',
        // 3D Flip simulated with 2D scaleX
        getTransform: (frameIndex, totalFrames) => {
            const t = (frameIndex / totalFrames) * Math.PI * 2;
            const scaleX = Math.cos(t);
            return {
                offsetX: 0,
                offsetY: 0,
                rotation: 0,
                scaleX: scaleX,
                scaleY: 1,
                opacity: 1,
            };
        },
    },
    {
        id: 'jelly',
        name: 'Jelly',
        icon: '/images/stickers/jelly.png',
        // Squash and stretch bounce
        getTransform: (frameIndex, totalFrames) => {
            const t = (frameIndex / totalFrames) * Math.PI * 2;
            // When going up, stretch Y (scale > 1). When hitting bottom, squash (scale < 1).
            // Since we only have uniform scale, we can't do true conservation of volume (scaleX * scaleY = 1).
            // We'll simulate a "Zooming" jelly effect.
            const scale = 1 + Math.sin(t * 2) * 0.1 + Math.cos(t) * 0.05;
            return {
                offsetX: 0,
                offsetY: Math.sin(t) * 5,
                rotation: Math.cos(t) * 5,
                scale: scale,
                opacity: 1
            };
        }
    }
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
export const ANIMATED_TEXT_FRAMES = 30;

/**
 * Default delay for animated text frames (in centiseconds for GIF)
 */
export const ANIMATED_TEXT_DELAY = 5; // 50ms per frame = 1.5s loop at 30 frames (slower to match preview)
