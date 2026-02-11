/**
 * Text Animation Presets for Meme Creator
 * Each animation defines a function to calculate per-frame transforms
 *
 * IMPORTANT: `duration` must match the CSS animation-duration in index.css
 * This ensures exported GIFs play at the same speed as the preview.
 */

/**
 * Helper: Linear Interpolation between two values
 */
function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * Helper: Interpolate between keyframes based on progress (0 to 1)
 * keyframes: Array of { pct: 0..1, transform: { x, y, rot, s, sx, sy, o } }
 * All transform properties are optional and default to 0 (or 1 for scale/opacity)
 */
function interpolateKeyframes(frames, progress) {
    // Ensure sorted by pct
    // frames.sort((a, b) => a.pct - b.pct); // Assumption: frames are defined in order

    // Find the two frames surrounding current progress
    let startFrame = frames[0];
    let endFrame = frames[frames.length - 1];

    for (let i = 0; i < frames.length - 1; i++) {
        if (progress >= frames[i].pct && progress < frames[i+1].pct) {
            startFrame = frames[i];
            endFrame = frames[i+1];
            break;
        }
    }

    // Calculate local t (0 to 1) between these two frames
    const range = endFrame.pct - startFrame.pct;
    const localT = range === 0 ? 0 : (progress - startFrame.pct) / range;

    // Easing? CSS 'ease-in-out' is common.
    // Implementing a simple easeInOutSine approximation for smoother motion than linear
    // ease-in-out: 0.5 * (1 - Math.cos(localT * Math.PI))
    const t = 0.5 * (1 - Math.cos(localT * Math.PI));

    const s = startFrame.transform;
    const e = endFrame.transform;

    return {
        offsetX: lerp(s.x || 0, e.x || 0, t),
        offsetY: lerp(s.y || 0, e.y || 0, t),
        rotation: lerp(s.rot || 0, e.rot || 0, t),
        scale: lerp(s.s ?? 1, e.s ?? 1, t),
        scaleX: lerp(s.sx ?? 1, e.sx ?? 1, t),
        scaleY: lerp(s.sy ?? 1, e.sy ?? 1, t),
        opacity: lerp(s.o ?? 1, e.o ?? 1, t),
    };
}

export const TEXT_ANIMATIONS = [
    {
        id: 'none',
        name: 'None',
        icon: '✖️',
        duration: 1000,
        getTransform: () => ({ offsetX: 0, offsetY: 0, rotation: 0, scale: 1, opacity: 1 }),
    },
    {
        id: 'wave',
        name: 'Wave',
        icon: '/images/stickers/wave.png',
        duration: 1000,
        // CSS: 0%->0, 25%->-8px, 75%->8px, 100%->0
        getTransform: (frameIndex, totalFrames, charIndex = 0) => {
            // Char offset for wave: each char is delayed slightly?
            // In CSS it's usually `animation-delay`.
            // Here `progress` should naturally flow.
            // If we want the "wave" look, `progress` needs to be offset by `charIndex`.

            // Standard wave period is 1s.
            // Let's assume progress is global time.
            let progress = (frameIndex / totalFrames);

            // Apply char offset (phase shift)
            // 0.1s delay per char roughly? 1s duration = 0.1 progress
            // But we need to keep it inside the 0-1 loop for interpolation lookup?
            // Actually, we can just shift the lookup.
            // (progress - delay) % 1
            const delay = charIndex * 0.1;
            progress = (progress - delay + 100) % 1; // +100 to handle negative wrap correctly

            const frames = [
                { pct: 0, transform: { y: 0 } },
                { pct: 0.25, transform: { y: -8 } }, // UP first
                { pct: 0.75, transform: { y: 8 } },  // DOWN
                { pct: 1, transform: { y: 0 } }
            ];
            return interpolateKeyframes(frames, progress);
        },
    },
    {
        id: 'bounce',
        name: 'Bounce',
        icon: '/images/stickers/bounce.svg',
        duration: 600,
        // CSS: 0%->0/1, 50%->-12px/1.05, 100%->0/1
        getTransform: (frameIndex, totalFrames) => {
            const progress = (frameIndex / totalFrames);
            const frames = [
                { pct: 0, transform: { y: 0, s: 1 } },
                { pct: 0.5, transform: { y: -12, s: 1.05 } },
                { pct: 1, transform: { y: 0, s: 1 } }
            ];
            return interpolateKeyframes(frames, progress);
        },
    },
    {
        id: 'shake',
        name: 'Shake',
        icon: '/images/stickers/shake.png',
        duration: 500,
        // CSS: Exact keyframes from index.css
        getTransform: (frameIndex, totalFrames) => {
            const progress = (frameIndex / totalFrames);
            const frames = [
                { pct: 0, transform: { x: 0, y: 0, rot: 0 } },
                { pct: 0.1, transform: { x: -4, y: 2, rot: -1 } },
                { pct: 0.2, transform: { x: 4, y: -2, rot: 1 } },
                { pct: 0.3, transform: { x: -3, y: 3, rot: -0.5 } },
                { pct: 0.4, transform: { x: 3, y: -3, rot: 0.5 } },
                { pct: 0.5, transform: { x: -2, y: 2, rot: 0 } },
                { pct: 0.6, transform: { x: 2, y: -1, rot: 0 } },
                { pct: 0.7, transform: { x: -3, y: 1, rot: -0.5 } },
                { pct: 0.8, transform: { x: 2, y: 2, rot: 0.5 } },
                { pct: 0.9, transform: { x: -1, y: -1, rot: 0 } },
                { pct: 1, transform: { x: 0, y: 0, rot: 0 } }
            ];
            return interpolateKeyframes(frames, progress);
        },
    },
    {
        id: 'glitch',
        name: 'Glitch',
        icon: '/images/stickers/glitch.png',
        duration: 800,
        // CSS: Exact keyframes (stepped, but linear interp between very close frames approximates 'steps' or we can just use the value)
        // Since glitch is 'steps(1)', we should technically NOT interpolate.
        // But for simplicity, we can just use the nearest frame logic manually or modify getTransform.
        // Let's use exact keyframes, and interpolateKeyframes will ease between them.
        // For crisp glitch, we want INSTANT changes.
        getTransform: (frameIndex, totalFrames) => {
             const t = frameIndex / totalFrames;
             // 10 steps (0% to 90%)
             // steps(1) means it jumps.
             const step = Math.floor(t * 10) % 10;

             const f = [
                 { x: 0, y: 0, o: 1 },
                 { x: 5, y: 0, o: 0.9 },
                 { x: -10, y: 2, o: 1 },
                 { x: 15, y: 0, o: 0.7 },
                 { x: -5, y: -2, o: 1 },
                 { x: 0, y: 0, o: 1 },
                 { x: 8, y: 0, o: 1 },
                 { x: -12, y: 3, o: 0.8 },
                 { x: 3, y: 0, o: 1 },
                 { x: -8, y: 0, o: 0.9 }
             ][step];

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
        duration: 800,
        // CSS: 0%->1, 50%->1.1, 100%->1
        getTransform: (frameIndex, totalFrames) => {
            const progress = (frameIndex / totalFrames);
            const frames = [
                { pct: 0, transform: { s: 1 } },
                { pct: 0.5, transform: { s: 1.1 } },
                { pct: 1, transform: { s: 1 } }
            ];
            return interpolateKeyframes(frames, progress);
        },
    },
    {
        id: 'float',
        name: 'Float',
        icon: '/images/stickers/float.png',
        duration: 2000,
        // CSS: 0%->(-1deg, 0y), 50%->(1deg, -6y), 100%->(-1deg, 0y)
        getTransform: (frameIndex, totalFrames) => {
            const progress = (frameIndex / totalFrames);
            const frames = [
                { pct: 0, transform: { y: 0, rot: -1 } },
                { pct: 0.5, transform: { y: -6, rot: 1 } },
                { pct: 1, transform: { y: 0, rot: -1 } }
            ];
            return interpolateKeyframes(frames, progress);
        },
    },
    {
        id: 'spin',
        name: 'Spin',
        icon: '/images/stickers/spin.png',
        duration: 1000,
        // CSS: 0->0deg, 100->360deg
        getTransform: (frameIndex, totalFrames) => {
            const progress = frameIndex / totalFrames;
            // Linear spin usually
            const rot = progress * 360;
            return {
                offsetX: 0,
                offsetY: 0,
                rotation: rot,
                scale: 1,
                opacity: 1,
            };
        },
    },
    {
        id: 'tada',
        name: 'Tada',
        icon: '/images/stickers/tada.png',
        duration: 1000,
        // CSS Tada
        getTransform: (frameIndex, totalFrames) => {
            const progress = (frameIndex / totalFrames);
            const frames = [
                { pct: 0, transform: { s: 1, rot: 0 } },
                { pct: 0.1, transform: { s: 0.9, rot: -3 } },
                { pct: 0.2, transform: { s: 0.9, rot: -3 } },
                { pct: 0.3, transform: { s: 1.1, rot: 3 } },
                { pct: 0.4, transform: { s: 1.1, rot: -3 } },
                { pct: 0.5, transform: { s: 1.1, rot: 3 } },
                { pct: 0.6, transform: { s: 1.1, rot: -3 } },
                { pct: 0.7, transform: { s: 1.1, rot: 3 } },
                { pct: 0.8, transform: { s: 1.1, rot: -3 } },
                { pct: 0.9, transform: { s: 1.1, rot: 3 } },
                { pct: 1, transform: { s: 1, rot: 0 } }
            ];
            return interpolateKeyframes(frames, progress);
        },
    },
    {
        id: 'wobble',
        name: 'Wobble',
        icon: '/images/stickers/wobble.png',
        duration: 2000,
        // CSS Wobble
        getTransform: (frameIndex, totalFrames) => {
            const progress = (frameIndex / totalFrames);
            const frames = [
                { pct: 0, transform: { x: 0, rot: 0 } },
                { pct: 0.15, transform: { x: -15, rot: -5 } },
                { pct: 0.30, transform: { x: 10, rot: 3 } },
                { pct: 0.45, transform: { x: -10, rot: -3 } },
                { pct: 0.60, transform: { x: 5, rot: 2 } },
                { pct: 0.75, transform: { x: -2, rot: -1 } },
                { pct: 1, transform: { x: 0, rot: 0 } }
            ];
            return interpolateKeyframes(frames, progress);
        },
    },
    {
        id: 'heartbeat',
        name: 'Heartbeat',
        icon: '/images/stickers/heartbeat.png',
        duration: 1300,
        // CSS: 0/14/28/42/70
        getTransform: (frameIndex, totalFrames) => {
            const progress = (frameIndex / totalFrames);
            const frames = [
                { pct: 0, transform: { s: 1 } },
                { pct: 0.14, transform: { s: 1.15 } },
                { pct: 0.28, transform: { s: 1 } },
                { pct: 0.42, transform: { s: 1.15 } },
                { pct: 0.70, transform: { s: 1 } },
                { pct: 1, transform: { s: 1 } }
            ];
            return interpolateKeyframes(frames, progress);
        },
    },
    {
        id: 'flip',
        name: 'Flip',
        icon: '/images/stickers/flip.png',
        duration: 1000,
        // CSS: 0 (1), 50 (-1), 100 (1)
        getTransform: (frameIndex, totalFrames) => {
            const progress = (frameIndex / totalFrames);
            const frames = [
                { pct: 0, transform: { sx: 1 } },
                { pct: 0.5, transform: { sx: -1 } },
                { pct: 1, transform: { sx: 1 } }
            ];
            return interpolateKeyframes(frames, progress);
        },
    },
    {
        id: 'jelly',
        name: 'Jelly',
        icon: '/images/stickers/jelly.png',
        duration: 900,
        // CSS Jelly
        getTransform: (frameIndex, totalFrames) => {
            const progress = (frameIndex / totalFrames);
            const frames = [
                { pct: 0, transform: { sx: 1, sy: 1, y: 0 } },
                { pct: 0.25, transform: { sx: 1.1, sy: 0.9, y: 0 } },
                { pct: 0.50, transform: { sx: 0.9, sy: 1.1, y: -10 } },
                { pct: 0.75, transform: { sx: 1.15, sy: 0.85, y: 0 } },
                { pct: 1, transform: { sx: 1, sy: 1, y: 0 } }
            ];
            return interpolateKeyframes(frames, progress);
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
 * Get the longest animation duration from a list of texts and stickers
 * Used to determine GIF loop duration for static backgrounds
 */
export function getMaxAnimationDuration(texts, stickers) {
    let maxDuration = 0;

    for (const text of (texts || [])) {
        if (text.animation && text.animation !== 'none') {
            const anim = getAnimationById(text.animation);
            if (anim && anim.duration > maxDuration) {
                maxDuration = anim.duration;
            }
        }
    }

    for (const sticker of (stickers || [])) {
        if (sticker.animation && sticker.animation !== 'none') {
            const anim = getAnimationById(sticker.animation);
            if (anim && anim.duration > maxDuration) {
                maxDuration = anim.duration;
            }
        }
    }

    return maxDuration || 1000; // Default to 1s if no animations
}

/**
 * Calculate LCM-based GIF loop duration to sync multiple animations
 * For simplicity, we use the max duration which ensures all animations complete at least once
 */
export function calculateGifLoopDuration(texts, stickers) {
    return getMaxAnimationDuration(texts, stickers);
}

/**
 * Default frame count for animated text on static images
 * Higher values = smoother animation but larger file size
 */
export const ANIMATED_TEXT_FRAMES = 30;

/**
 * Default delay for animated text frames (in centiseconds for GIF)
 * This is now dynamically calculated based on animation duration
 */
export const ANIMATED_TEXT_DELAY = 3; // Legacy default, not used in new system
