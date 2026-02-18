import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export function ModeSelector({ mode, onModeChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (value) => {
    // Haptic feedback on mode change
    if (navigator.vibrate) navigator.vibrate(30);
    onModeChange({ target: { value } });
    setIsOpen(false);
  };

  return (
    <div className="relative w-full z-[60]" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select Content Mode"
        className={`w-full select-trigger px-4 py-3 flex items-center justify-center relative ${isOpen ? 'ring-2 ring-brand border-transparent' : 'hover:bg-white/5'}`}
      >
        <span className="font-bold text-lg animate-text-shimmer whitespace-nowrap">
          {mode === "image" ? "Images" : "Videos"}
        </span>
        <ChevronDown className={`absolute right-4 w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand' : ''}`} />
      </button>

      {isOpen && (
        <div
            className="absolute top-full mt-2 left-0 w-full card-bg border border-[#2f3336] rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col p-2"
            role="listbox"
            aria-label="Content Mode Options"
        >
            <button
                onClick={() => handleSelect("image")}
                role="option"
                aria-selected={mode === "image"}
                className={`relative flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors group ${mode === "image" ? "bg-[#2f3336]" : "hover:bg-white/5 hover:text-slate-300"}`}
            >
                {mode === "image" && (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-transparent rounded-lg border border-brand/20 pointer-events-none" />
                )}
                <span className={`relative z-10 font-bold whitespace-nowrap ${mode === "image" ? "text-white" : "text-slate-400 group-hover:text-slate-300"}`}>
                    Images
                </span>
                {mode === "image" && <div className="relative z-10 ml-auto w-2 h-2 rounded-full bg-brand shrink-0 mr-2" />}
            </button>

            <button
                onClick={() => handleSelect("video")}
                role="option"
                aria-selected={mode === "video"}
                className={`relative flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors group ${mode === "video" ? "bg-[#2f3336]" : "hover:bg-white/5 hover:text-slate-300"}`}
            >
                {mode === "video" && (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-transparent rounded-lg border border-brand/20 pointer-events-none" />
                )}
                <span className={`relative z-10 font-bold whitespace-nowrap ${mode === "video" ? "text-white" : "text-slate-400 group-hover:text-slate-300"}`}>
                    Videos
                </span>
                {mode === "video" && <div className="relative z-10 ml-auto w-2 h-2 rounded-full bg-brand shrink-0 mr-2" />}
            </button>
        </div>
      )}
    </div>
  );
}
