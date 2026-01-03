import { useState, useRef, useEffect } from "react";
import { ChevronDown, Image as ImageIcon, Video } from "lucide-react";

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
    onModeChange({ target: { value } });
    setIsOpen(false);
  };

  return (
    <div className="relative w-full z-30" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-xl bg-slate-900/50 border border-slate-700 p-3 flex items-center justify-center relative transition-all active:scale-[0.99] ${isOpen ? 'ring-2 ring-brand border-transparent' : 'hover:bg-white/5'}`}
      >
        <div className="flex items-center gap-3">
            {mode === "image" ? <ImageIcon className="w-5 h-5 text-brand" /> : <Video className="w-5 h-5 text-brand" />}
            <span className="font-bold text-lg animate-text-shimmer">
            {mode === "image" ? "Static Images" : "Animated GIFs"}
            </span>
        </div>
        <ChevronDown className={`absolute right-4 w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col p-1">
            <button
                onClick={() => handleSelect("image")}
                className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors group ${mode === "image" ? "bg-slate-800" : "hover:bg-brand"}`}
            >
                <ImageIcon className={`w-5 h-5 ${mode === "image" ? "text-brand" : "text-slate-400 group-hover:text-white"}`} />
                <span className={`font-bold ${mode === "image" ? "text-white" : "text-slate-300 group-hover:text-white"}`}>
                    Static Images
                </span>
                {mode === "image" && <div className="ml-auto w-2 h-2 rounded-full bg-brand" />}
            </button>
            
            <button
                onClick={() => handleSelect("video")}
                className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors group ${mode === "video" ? "bg-slate-800" : "hover:bg-brand"}`}
            >
                <Video className={`w-5 h-5 ${mode === "video" ? "text-brand" : "text-slate-400 group-hover:text-white"}`} />
                <span className={`font-bold ${mode === "video" ? "text-white" : "text-slate-300 group-hover:text-white"}`}>
                    Animated GIFs
                </span>
                {mode === "video" && <div className="ml-auto w-2 h-2 rounded-full bg-brand" />}
            </button>
        </div>
      )}
    </div>
  );
}
