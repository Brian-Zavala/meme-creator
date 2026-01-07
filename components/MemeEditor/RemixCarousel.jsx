import { lazy, Suspense } from "react";
import FireBackground from "../ui/FireBackground";
import CaptionRemixBackground from "../ui/CaptionRemixBackground";
import StyleShuffleBackground from "../ui/StyleShuffleBackground";
import FilterFrenzyBackground from "../ui/FilterFrenzyBackground";
import VibeCheckBackground from "../ui/VibeCheckBackground";
import DeepFryBackground from "../ui/DeepFryBackground";

/**
 * RemixCarousel - 6 creative remix buttons with unique animated backgrounds
 * Mobile: Horizontal snap-scroll
 * Tablet: 3-column grid  
 * Desktop: 6-column row
 */
export default function RemixCarousel({
    onChaos,
    onCaptionRemix,
    onStyleShuffle,
    onFilterFrenzy,
    onVibeCheck,
    onExtremeDeepFry
}) {
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
        }
    ];

    return (
        <div
            className="remix-carousel"
            role="group"
            aria-label="Remix Options"
        >
            {remixModes.map(({ id, label, handler, Background, ariaLabel }) => (
                <button
                    key={id}
                    onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(30);
                        handler();
                    }}
                    className="remix-btn relative overflow-hidden group border-2 border-white/10 hover:border-white/30 rounded-xl transition-all active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    aria-label={ariaLabel}
                >
                    {/* Animated background */}
                    <Background />

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
            ))}
        </div>
    );
}
