import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Square, LayoutTemplate, Columns, Rows, Grip } from "lucide-react";

export function LayoutSelector({ layout, onLayoutChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  const layouts = [
    { id: "single", label: "Single", icon: Square },
    { id: "top-bottom", label: "Vertical Split", icon: Rows },
    { id: "side-by-side", label: "Side by Side", icon: Columns },
    { id: "grid-4", label: "Four Grid", icon: Grip },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target) && 
          !event.target.closest('[data-layout-dropdown]')) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  const handleSelect = (id) => {
    onLayoutChange(id);
    setIsOpen(false);
  };

  const activeLayout = layouts.find(l => l.id === layout) || layouts[0];

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select Layout"
        className={`w-full select-trigger px-4 py-3 flex items-center justify-center relative ${isOpen ? 'ring-2 ring-brand border-transparent' : 'hover:bg-white/5'}`}
      >
        <div className="flex items-center gap-3">
            <LayoutTemplate className="w-5 h-5 text-brand shrink-0 lg:absolute lg:left-2" />
            <span className="font-bold text-lg whitespace-nowrap">
                {activeLayout.label}
            </span>
        </div>
        <ChevronDown className={`absolute right-4 w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div
            data-layout-dropdown
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
            }}
            className="bg-[#0f0f0f] border border-[#2f3336] rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col p-2 z-[9999]"
            role="listbox"
            aria-label="Layout Options"
        >
            {layouts.map((l) => (
                <button
                    key={l.id}
                    onClick={() => handleSelect(l.id)}
                    role="option"
                    aria-selected={layout === l.id}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors group ${layout === l.id ? "bg-[#222222]" : "bg-[#0f0f0f] hover:bg-brand"}`}
                >
                    <l.icon className={`w-5 h-5 shrink-0 ${layout === l.id ? "text-brand" : "text-slate-400 group-hover:text-white"}`} />
                    <span className={`font-bold ${layout === l.id ? "text-white" : "text-slate-300 group-hover:text-white"}`}>
                        {l.label}
                    </span>
                    {layout === l.id && <div className="ml-auto w-2 h-2 rounded-full bg-brand shrink-0 mr-2" />}
                </button>
            ))}
        </div>,
        document.body
      )}
    </div>
  );
}
