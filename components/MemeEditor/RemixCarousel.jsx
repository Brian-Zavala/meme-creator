import { lazy, Suspense } from "react";
import FireBackground from "../ui/FireBackground";
import CaptionRemixBackground from "../ui/CaptionRemixBackground";
import StyleShuffleBackground from "../ui/StyleShuffleBackground";
import FilterFrenzyBackground from "../ui/FilterFrenzyBackground";
import VibeCheckBackground from "../ui/VibeCheckBackground";
import DeepFryBackground from "../ui/DeepFryBackground";
import StickerfyBackground from "../ui/StickerfyBackground";
import NukedBackground from "../ui/NukedBackground";
import GlitchBackground from "../ui/GlitchBackground";
import CursedBackground from "../ui/CursedBackground";
import ConfettiBlastBackground from "../ui/ConfettiBlastBackground";
import TimeWarpBackground from "../ui/TimeWarpBackground";

/**
 * RemixCarousel - 12 creative remix buttons with unique animated backgrounds
 * Mobile: 2x6 grid (scrollable)
 * Tablet: 3x4 grid
 * Desktop: 2 rows of 6
 */
export default function RemixCarousel({
    onChaos,
    onCaptionRemix,
    onStyleShuffle,
    onFilterFrenzy,
    onVibeCheck,
    onExtremeDeepFry,
    onStickerfy,
    onNuked,
    onGlitch,
    onCursed,
    onConfettiBlast,
    onTimeWarp,
    deepFryLevel = 0,
    isProcessing = false
}) {
    // Buttons that can trigger deep fry processing and should be locked during processing
    const deepFryTriggerButtons = ['chaos', 'filter', 'vibe', 'deepfry', 'nuked', 'glitch', 'cursed', 'timewarp'];

    const remixModes = [
        {
            id: "chaos",
            label: "Chaos Mode",
            handler: onChaos,
            Background: FireBackground,
            ariaLabel: "Full chaos - randomize everything"
        },
        {
            id: "caption",
            label: "Caption Remix",
            handler: onCaptionRemix,
            Background: CaptionRemixBackground,
            ariaLabel: "Generate new captions, keep current image"
        },
        {
            id: "style",
            label: "Style Shuffle",
            handler: onStyleShuffle,
            Background: StyleShuffleBackground,
            ariaLabel: "Randomize font, colors, and spacing"
        },
        {
            id: "filter",
            label: "Filter Frenzy",
            handler: onFilterFrenzy,
            Background: FilterFrenzyBackground,
            ariaLabel: "Apply random image filters"
        },
        {
            id: "vibe",
            label: "Vibe Check",
            handler: onVibeCheck,
            Background: VibeCheckBackground,
            ariaLabel: "Apply themed filter preset"
        },
        {
            id: "deepfry",
            label: "Extreme Deep Fry",
            handler: onExtremeDeepFry,
            Background: DeepFryBackground,
            ariaLabel: "Apply extreme deep fry effect"
        },
        {
            id: "stickerfy",
            label: "Stickerfy",
            handler: onStickerfy,
            Background: StickerfyBackground,
            ariaLabel: "Add random trending stickers from Giphy"
        },
        {
            id: "nuked",
            label: "Nuked",
            handler: onNuked,
            Background: NukedBackground,
            ariaLabel: "Extreme compression artifacts - needs more JPEG"
        },
        {
            id: "glitch",
            label: "Glitch",
            handler: onGlitch,
            Background: GlitchBackground,
            ariaLabel: "RGB channel split and chromatic aberration"
        },
        {
            id: "cursed",
            label: "Cursed",
            handler: onCursed,
            Background: CursedBackground,
            ariaLabel: "Dark inverted void with chaotic positioning"
        },
        {
            id: "confetti",
            label: "Confetti Blast",
            handler: onConfettiBlast,
            Background: ConfettiBlastBackground,
            ariaLabel: "Emoji particle explosion celebration"
        },
        {
            id: "timewarp",
            label: "Time Warp",
            handler: onTimeWarp,
            Background: TimeWarpBackground,
            ariaLabel: "Extreme distortion and motion blur"
        }
    ];

    return (
        <div
            className="remix-carousel"
            role="group"
            aria-label="Remix Options"
        >
            {remixModes.map(({ id, label, handler, Background, ariaLabel }) => {
                // Lock buttons that can trigger deep fry while processing is active
                const isLocked = isProcessing && deepFryTriggerButtons.includes(id);

                return (
                    <button
                        key={id}
                        onClick={() => {
                            if (isLocked) return; // Prevent action if locked
                            if (navigator.vibrate) navigator.vibrate(30);
                            handler();
                        }}
                        disabled={isLocked}
                        className={`remix-btn relative overflow-hidden group border-2 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${isLocked
                            ? 'border-white/5 opacity-50 cursor-not-allowed'
                            : 'border-white/10 hover:border-white/30 active:scale-[0.97]'
                            }`}
                        aria-label={isLocked ? `${ariaLabel} (processing...)` : ariaLabel}
                        aria-disabled={isLocked}
                    >
                        {/* Animated background */}
                        {id === 'deepfry' ? (
                            <Background key={deepFryLevel > 0 ? 'active' : 'inactive'} />
                        ) : (
                            <Background />
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors duration-300 z-10" />

                        {/* Label */}
                        <div className="relative z-20 flex items-center justify-center py-3 px-2">
                            <span
                                className="font-black uppercase tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] text-center leading-tight"
                                style={{ fontSize: 'clamp(0.5rem, 2vw + 0.25rem, 0.8rem)' }}
                            >
                                {label}
                            </span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
