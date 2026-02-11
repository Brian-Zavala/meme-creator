import { Flame, Camera, Aperture } from "lucide-react";

const SOURCES = [
  { id: "imgflip", label: "Memes", Icon: Flame },
  { id: "unsplash", label: "Unsplash", Icon: Camera },
  { id: "pexels", label: "Pexels", Icon: Aperture },
];

/**
 * Compact pill-style image source selector.
 * Renders inline above the search input in image mode.
 */
export default function ImageSourceTabs({ activeSource, onSourceChange }) {
  return (
    <div className="flex p-1 bg-[#181818] rounded-xl border border-[#2f3336]">
      {SOURCES.map(({ id, label, Icon }) => {
        const isActive = activeSource === id;
        return (
          <button
            key={id}
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(15);
              onSourceChange(id);
            }}
            className={`
              relative flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200
              ${isActive
                ? "text-white shadow-lg shadow-brand/10 bg-[#2f3336]"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              }
            `}
            aria-pressed={isActive}
          >
            {isActive && (
              <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-transparent rounded-lg border border-brand/20" />
            )}
            <Icon className={`w-3.5 h-3.5 z-10 relative shrink-0 ${isActive ? "text-brand" : "currentColor"}`} />
            <span className="relative z-10 hidden xs:inline">{label}</span>
            <span className="relative z-10 xs:hidden">{label.slice(0, 1)}</span>
          </button>
        );
      })}
    </div>
  );
}
