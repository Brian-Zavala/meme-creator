
const SOURCES = [
  { id: "giphy", label: "GIFs"  }, // Using "GIFs" label for Tenor/Giphy
  { id: "pexels", label: "Pexels" },
];

export default function VideoSourceTabs({ activeSource, onSourceChange }) {
  return (
    <div className="flex p-1 bg-[#181818] rounded-xl border border-[#2f3336]">
      {SOURCES.map((source) => {
        const isActive = activeSource === source.id;

        return (
          <button
            key={source.id}
            onClick={() => onSourceChange(source.id)}
            className={`
              relative flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200
              ${isActive
                ? "text-white shadow-lg shadow-brand/10 bg-[#2f3336]"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              }
            `}
          >
            {isActive && (
              <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-transparent rounded-lg border border-brand/20" />
            )}
            <span className="relative z-10">{source.label}</span>
          </button>
        );
      })}
    </div>
  );
}
