import { useState, useEffect, useRef } from "react";
import { Type, Smile, ChevronDown, HelpCircle, Sparkles, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import MemeStickerLibrary from "./MemeStickerLibrary";

export default function MemeInputs({ texts, handleTextChange, onAddSticker, onMagicCaption, isMagicGenerating, onChaos, hasStickers, onExportStickers }) {
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
    toast("Tip: Double-tap or Long-press a sticker to remove it!", {
      icon: "💡",
      style: { borderRadius: '10px', background: '#333', color: '#fff' },
      duration: 3000
    });
  };

  return (
    <div className={`flex flex-col bg-slate-900/50 rounded-2xl border border-white/5 shadow-xl backdrop-blur-sm relative transition-all duration-300 ${isOpen ? 'z-50 ring-1 ring-white/10' : 'z-10'}`}>
      {/* Header with Magic AI */}
      <div className="flex items-center justify-between p-6 pb-2">
        <div className="flex items-center gap-2 text-slate-400 uppercase text-xs font-bold tracking-wider" aria-hidden="true">
          <Type className="w-4 h-4" /> Content
        </div>
        <button
          onClick={onMagicCaption}
          disabled={isMagicGenerating}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition-all active:scale-90 border border-brand/20 group ${isMagicGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Generate Magic Caption"
          aria-label="Generate Magic Caption with AI"
        >
          {isMagicGenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" aria-hidden="true" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">
            {isMagicGenerating ? "Generating..." : "Magic AI"}
          </span>
        </button>
      </div>

      {/* Scrolling Text Inputs area */}
      <div className="px-6 space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin mb-4" role="group" aria-label="Text Inputs">
        {(() => {
          let lastFilledIndex = -1;
          for (let i = texts.length - 1; i >= 0; i--) {
            if ((texts[i].content || "").trim().length > 0) {
              lastFilledIndex = i;
              break;
            }
          }

          const visibleCount = Math.min(Math.max(lastFilledIndex + 2, 2), texts.length);

          return texts.slice(0, visibleCount).map((textItem, index) => (
            <div key={textItem.id} className="relative group animate-in slide-in-from-left duration-300">
              <label htmlFor={`text-input-${textItem.id}`} className="sr-only">
                {index === 0 ? "Top Text" : index === 1 ? "Bottom Text" : `Text line ${index + 1}`}
              </label>
              <input
                id={`text-input-${textItem.id}`}
                type="text"
                placeholder={index === 0 ? "Top Text" : index === 1 ? "Bottom Text" : `Text #${index + 1}`}
                className="w-full input-glass rounded-xl px-4 py-3 text-lg focus:outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-yellow-500"
                onChange={(e) => handleTextChange(textItem.id, e.target.value)}
                value={textItem.content}
              />
              <div className="absolute right-3 top-3.5 text-slate-600 pointer-events-none text-xs bg-slate-800 px-2 py-0.5 rounded uppercase" aria-hidden="true">
                {index === 0 ? "TOP" : index === 1 ? "BOTTOM" : `#${index + 1}`}
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Custom Sticker Dropdown Section */}
      <div className="px-6 pb-6 relative" ref={dropdownRef}>
        <div className="pt-4 border-t border-white/5 flex flex-col">
          <div className="flex gap-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-haspopup="true"
              aria-expanded={isOpen}
              aria-label="Add Sticker Menu"
              className={`flex-1 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl px-4 py-3 transition-all active:scale-95 group focus:outline-none focus:ring-2 focus:ring-yellow-500 ${isOpen ? 'ring-2 ring-brand border-transparent' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-brand/10 text-brand group-hover:bg-brand/20 transition-colors" aria-hidden="true">
                  <Smile className="w-5 h-5" />
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
      </div>
    </div>

  );
}