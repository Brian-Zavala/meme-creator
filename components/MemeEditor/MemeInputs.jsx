import { useState, useEffect, useRef } from "react";
import { Type, Smile, Plus, ChevronDown, HelpCircle, Sparkles, Loader2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { removeImageBackground } from "../../services/backgroundRemover";

const STICKER_CATEGORIES = {
  "Reactions": ["😂", "💀", "😭", "🤡", "😎", "😡", "😱", "🤔", "🤫", "😴"],
  "Hands": ["👍", "👎", "👌", "✌️", "🤞", "🤟", "👊", "👏", "🙌", "🙏"],
  "Love": ["❤️", "💔", "💕", "💖", "😍", "😘", "🥰", "💌", "💘", "💝"],
  "Animals": ["🐈", "🐕", "🐸", "🙈", "🙉", "🙊", "🐵", "🦄", "🐔", "🐧"],
  "Objects": ["🔥", "💯", "✨", "🎉", "🍆", "🍑", "💩", "💣", "💎", "💰"],
  "Symbols": ["⚠️", "🚫", "✅", "❌", "❓", "❗️", "💯", "💢", "💤", "💨"]
};

export default function MemeInputs({ texts, handleTextChange, onAddSticker, onMagicCaption, isMagicGenerating }) {
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

  const selectSticker = (sticker) => {
    onAddSticker(sticker);
    setIsOpen(false);
  };

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
        <div className="pt-4 border-t border-white/5 flex gap-2">
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

            {/* Floating Menu */}
            {isOpen && (
                <div 
                    className="absolute left-6 right-6 top-full mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in zoom-in-95 fade-in duration-200 origin-top"
                    role="menu"
                    aria-label="Sticker Categories"
                >
                    <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin">
                        {/* Custom Upload Button */}
                        <div className="mb-2">
                          <label className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 hover:text-white text-slate-400 rounded-xl cursor-pointer transition-all active:scale-95 group border-dashed">
                            <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                            <span className="text-xs font-bold uppercase tracking-wide">Upload Custom Sticker</span>
                            <input 
                              id="sticker-upload"
                              name="sticker-upload"
                              type="file" 
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                e.target.value = ''; // Reset
                                setIsOpen(false);

                                toast((t) => (
                                  <div className="flex flex-col gap-3 min-w-[200px]">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-brand" />
                                        <span className="font-bold text-sm">Remove background?</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={async () => {
                                          toast.dismiss(t.id);
                                          const toastId = toast.loading("Removing background... (AI Model loading)", { style: { minWidth: '250px' } });
                                          try {
                                              const blob = await removeImageBackground(file);
                                              const url = URL.createObjectURL(blob);
                                              onAddSticker(url, 'image');
                                              toast.success("Background removed!", { id: toastId });
                                          } catch (err) {
                                              console.error(err);
                                              toast.error("Failed. Using original.", { id: toastId });
                                              const url = URL.createObjectURL(file);
                                              onAddSticker(url, 'image');
                                          }
                                        }}
                                        className="flex-1 bg-brand text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg shadow-brand/20 hover:bg-brand-dark transition-colors"
                                      >
                                        Yes, Magic
                                      </button>
                                      <button 
                                        onClick={() => {
                                          toast.dismiss(t.id);
                                          const url = URL.createObjectURL(file);
                                          onAddSticker(url, 'image');
                                        }}
                                        className="flex-1 bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-600 transition-colors"
                                      >
                                        No, Original
                                      </button>
                                    </div>
                                  </div>
                                ), { duration: 8000, position: 'top-center', style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } });
                              }}
                            />
                          </label>
                        </div>

                        {Object.entries(STICKER_CATEGORIES).map(([category, stickers]) => (
                            <div key={category} className="mb-4 last:mb-0" role="group" aria-label={category}>
                                <div className="px-3 py-2 flex items-center gap-2" aria-hidden="true">
                                    <span className="h-px flex-1 bg-slate-800"></span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">
                                        {category}
                                    </span>
                                    <span className="h-px flex-1 bg-slate-800"></span>
                                </div>
                                <div className="grid grid-cols-5 gap-1">
                                    {stickers.map(sticker => (
                                        <button 
                                            key={sticker}
                                            onClick={() => selectSticker(sticker)}
                                            role="menuitem"
                                            className="h-12 flex items-center justify-center text-2xl hover:bg-slate-800 rounded-lg transition-all active:scale-75 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                            aria-label={`Add ${sticker} sticker`}
                                        >
                                            {sticker}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}