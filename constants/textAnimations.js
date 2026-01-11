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
        // Bouncing with physics-like easing (Match CSS: 0%->0, 50%->-12px/1.05s, 100%->0)
        getTransform: (frameIndex, totalFrames) => {
            const t = (frameIndex / totalFrames);
            // Sine wave 0->PI (0 to 1 to 0)
            const sinVal = Math.sin(t * Math.PI); 
            const bounce = sinVal * 12;
            return {
                offsetX: 0,
                offsetY: -bounce,
                rotation: 0,
                scale: 1 + (sinVal * 0.05),
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
            const seed = Math.floor(frameIndex) * 12345;
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
        // Match CSS keyframes exactly for consistent export
        getTransform: (frameIndex, totalFrames) => {
            const t = frameIndex / totalFrames;
            // 10 steps (0% to 90%)
            const step = Math.floor(t * 10) % 10;

            const frames = [
                { x: 0, y: 0, o: 1 },         // 0%
                { x: 5, y: 0, o: 0.9 },       // 10%
                { x: -10, y: 2, o: 1 },       // 20%
                { x: 15, y: 0, o: 0.7 },      // 30%
                { x: -5, y: -2, o: 1 },       // 40%
                { x: 0, y: 0, o: 1 },         // 50%
                { x: 8, y: 0, o: 1 },         // 60%
                { x: -12, y: 3, o: 0.8 },     // 70%
                { x: 3, y: 0, o: 1 },         // 80%
                { x: -8, y: 0, o: 0.9 }       // 90%
            ];

            const f = frames[step];
            return {
                offsetX: f.x,
                offsetY: f.y,
                rotation: 0,
                scale: 1,
                opacity: f.o,
            };
        },
    },
    {
        id: 'pulse',
        name: 'Pulse',
        icon: '/images/stickers/pulse.svg',
        // Scale pulsing effect (Match CSS: 0%->1, 50%->1.1, 100%->1)
        getTransform: (frameIndex, totalFrames) => {
            const t = (frameIndex / totalFrames);
            // Sine wave 0->PI (0 to 1 to 0)
            const sinVal = Math.sin(t * Math.PI); 
            const pulseScale = 1 + (sinVal * 0.1);
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
        // Gentle floating up and down (Match CSS: Only Y axis and rotation)
        getTransform: (frameIndex, totalFrames) => {
            const t = (frameIndex / totalFrames) * Math.PI * 2;
            return {
                offsetX: 0,
                offsetY: Math.sin(t) * -6, // CSS goes -6px at 50% (up)
                rotation: Math.sin(t) * 1, // CSS goes 1deg at 50%
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
        // Iconic double-pulse (Match CSS: 0%, 14%, 28%, 42%, 70%)
        getTransform: (frameIndex, totalFrames) => {
            const t = (frameIndex / totalFrames); // 0 to 1
            // Heartbeat mathematical approximation
            // Two rapid pulses per cycle
            let scale = 1;
            // First pulse: 0% to 28% (Peak at 14%)
            if (t < 0.28) {
                scale = 1 + Math.sin((t / 0.28) * Math.PI) * 0.15;
            } 
            // Second pulse: 28% to 70% (Peak at 42% -> 28 + 14) - CSS peak is at 42%, ends at 70%
            // 28% to 70% is a range of 0.42. 
            // Peak at 42% is (42-28)/42 = 14/42 = 1/3 of the way through the pulse? 
            // Actually CSS is 28->42->70. The peak is at 42. (42-28)=14. (70-42)=28. 
            // So it rises fast (14%) and falls slow (28%).
            else if (t >= 0.28 && t < 0.70) {
                 const localT = (t - 0.28) / (0.70 - 0.28); // 0 to 1
                 // Use a sine wave but shifted? Or just a simple up/down.
                 // Let's use standard sine for simplicity, close enough to CSS ease-in-out
                 scale = 1 + Math.sin(localT * Math.PI) * 0.15;
            }

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
export const ANIMATED_TEXT_DELAY = 3; // 30ms per frame = 0.9s loop at 30 frames (matches CSS animation ~1s average)
