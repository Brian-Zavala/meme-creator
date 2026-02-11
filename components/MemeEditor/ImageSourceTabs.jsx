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
    <div className="flex gap-1 p-1 bg-[#111]/60 rounded-xl border border-[#2f3336]/60 backdrop-blur-sm">
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
              flex-1 flex items-center justify-center gap-1.5
              px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider
              transition-all duration-200 ease-out
              ${isActive
                ? "bg-brand text-white shadow-lg shadow-brand/30 scale-[1.02]"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5 active:scale-95"
              }
            `}
            aria-pressed={isActive}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : ""}`} />
            <span className="hidden xs:inline">{label}</span>
            <span className="xs:hidden">{label.slice(0, 1)}</span>
          </button>
        );
      })}
    </div>
  );
}
