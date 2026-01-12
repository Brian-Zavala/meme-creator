import { useState, useRef, useEffect } from "react";
import { ChevronDown, HelpCircle, Smile } from "lucide-react";
import toast from "react-hot-toast";
import MemeStickerLibrary from "./MemeStickerLibrary";

export function MemeStickerSection({ onAddSticker, hasStickers, onExportStickers }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showStickerHelp = (e) => {
    e.stopPropagation();
    toast("Tip: Double-tap a sticker to remove it!", {
      icon: (
        <picture>
          <source srcSet="https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a1/512.webp" type="image/webp" />
          <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a1/512.gif" alt="💡" width="32" height="32" />
        </picture>
      ),
      style: { borderRadius: '10px', background: '#333', color: '#fff' },
      duration: 3000
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-label="Add Sticker Menu"
          className={`flex-1 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl px-4 py-3 transition-all active:scale-95 group focus:outline-none focus:ring-2 focus:ring-yellow-500 ${isOpen ? 'ring-2 ring-brand border-transparent' : ''}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg transition-colors" aria-hidden="true">
              <img src="/images/stickers/sticker.png" alt="" className="w-5 h-5 object-contain" />
            </div>
            <span className="text-slate-300 font-medium">Add a sticker...</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-yellow-500' : ''}`} aria-hidden="true" />
        </button>

        <button
          onClick={showStickerHelp}
          className="w-12 flex items-center justify-center bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          title="Sticker Help"
          aria-label="Sticker Help"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Export Stickers Button */}
      {hasStickers && (
        <button
          onClick={onExportStickers}
          className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-700 bg-slate-800/20 text-slate-400 hover:text-white hover:border-brand/50 hover:bg-brand/5 transition-all text-xs font-bold uppercase tracking-wider group"
        >
          <Smile className="w-4 h-4 group-hover:text-brand transition-colors" />
          <span>Export Stickers Only</span>
        </button>
      )}

      {/* Floating Menu - USING THE NEW LIBRARY COMPONENT */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in zoom-in-95 fade-in duration-200 origin-top h-[400px]"
          role="menu"
          aria-label="Sticker Categories"
        >
          <MemeStickerLibrary
            onAddSticker={onAddSticker}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
