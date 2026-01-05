import { useState, useRef, useEffect } from "react";
import { ChevronDown, Square, LayoutTemplate, Columns, Rows, Grip } from "lucide-react";

export function LayoutSelector({ layout, onLayoutChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const layouts = [
    { id: "single", label: "Single", icon: Square },
    { id: "top-bottom", label: "Vertical Split", icon: Rows },
    { id: "side-by-side", label: "Side by Side", icon: Columns },
    { id: "grid-4", label: "Four Grid", icon: Grip },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id) => {
    onLayoutChange(id);
    setIsOpen(false);
  };

  const activeLayout = layouts.find(l => l.id === layout) || layouts[0];
  const ActiveIcon = activeLayout.icon;

  return (
    <div className="relative w-full z-[59]" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-xl bg-slate-900/50 border border-slate-700 p-3 flex items-center justify-center relative transition-all active:scale-[0.99] ${isOpen ? 'ring-2 ring-brand border-transparent' : 'hover:bg-white/5'}`}
      >
        <div className="flex items-center gap-3">
            <LayoutTemplate className="w-5 h-5 text-brand" />
            <span className="font-bold text-lg">
                {activeLayout.label}
            </span>
        </div>
        <ChevronDown className={`absolute right-4 w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col p-1">
            {layouts.map((l) => (
                <button
                    key={l.id}
                    onClick={() => handleSelect(l.id)}
                    className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors group ${layout === l.id ? "bg-slate-800" : "hover:bg-brand"}`}
                >
                    <l.icon className={`w-5 h-5 ${layout === l.id ? "text-brand" : "text-slate-400 group-hover:text-white"}`} />
                    <span className={`font-bold ${layout === l.id ? "text-white" : "text-slate-300 group-hover:text-white"}`}>
                        {l.label}
                    </span>
                    {layout === l.id && <div className="ml-auto w-2 h-2 rounded-full bg-brand" />}
                </button>
            ))}
        </div>
      )}
    </div>
  );
}
