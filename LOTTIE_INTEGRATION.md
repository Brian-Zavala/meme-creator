# Lottie Animation Integration Guide

## Background Components Ready for Lotties

All 6 new background components are prepared to accept Lottie animations. When you have the `.json` files ready, follow this pattern to integrate them:

### Files to Update

| Component | File Path | Expected Lottie Path |
|-----------|-----------|---------------------|
| StickerfyBackground | `components/ui/StickerfyBackground.jsx` | `/public/animations/stickerfy.json` |
| NukedBackground | `components/ui/NukedBackground.jsx` | `/public/animations/nuked.json` |
| GlitchBackground | `components/ui/GlitchBackground.jsx` | `/public/animations/glitch.json` |
| CursedBackground | `components/ui/CursedBackground.jsx` | `/public/animations/cursed.json` |
| ConfettiBlastBackground | `components/ui/ConfettiBlastBackground.jsx` | `/public/animations/confetti-blast.json` |
| TimeWarpBackground | `components/ui/TimeWarpBackground.jsx` | `/public/animations/time-warp.json` |

### Integration Pattern

Use this template (following `DeepFryBackground.jsx`):

```jsx
import LottieAnimation from '../Animations/LottieAnimation';

/**
 * [Name] Background - [Description]
 */
export default function [Name]Background() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-[COLOR] flex items-center justify-center">
            <LottieAnimation
                src="/animations/[filename].json"
                className="w-full h-full object-cover opacity-90"
                style={{ width: '100%', height: '100%', transform: 'scale(1.40)' }}
            />
        </div>
    );
}
```

### Example: Stickerfy with Lottie

**Before** (CSS fallback):
```jsx
export default function StickerfyBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500">
            {/* CSS animations here */}
        </div>
    );
}
```

**After** (With Lottie):
```jsx
import LottieAnimation from '../Animations/LottieAnimation';

export default function StickerfyBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center">
            <LottieAnimation
                src="/animations/stickerfy.json"
                className="w-full h-full opacity-90"
                style={{ width: '100%', height: '100%', transform: 'scale(1.5)' }}
            />
        </div>
    );
}
```

### Animation Characteristics

Each Lottie should embody these aesthetics:

1. **Stickerfy** - Floating, playful sticker particles on colorful gradient
2. **Nuked** - Explosive, glitchy, compression artifact chaos
3. **Glitch** - RGB channel separation, scan lines, digital distortion
4. **Cursed** - Dark, ominous, glowing eyes in void
5. **Confetti Blast** - Bursting particle explosion, celebration vibes
6. **Time Warp** - Warping, rippling, distortion waves

### Current Status

✅ All 6 background components created with CSS fallbacks
✅ TODO comments added indicating where Lotties will go
⏳ **WAITING**: Lottie `.json` files to be added to `/public/animations/`

### Next Steps (When Lotties Are Ready)

1. Add `.json` files to `/public/animations/`
2. Import `LottieAnimation` in each background component
3. Replace CSS animation div with `<LottieAnimation src="..." />`
4. Adjust `transform: scale()` and `opacity` for optimal appearance
5. Test on mobile and desktop

The CSS fallbacks will continue working until you replace them!
