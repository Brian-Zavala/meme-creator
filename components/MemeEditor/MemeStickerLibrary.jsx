import { useState, useEffect } from "react";
import { Smile, Search, Loader2, Image as ImageIcon, Upload, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { searchTenor } from "../../services/tenor";
import { removeImageBackground } from "../../services/backgroundRemover";

// Moved from MemeInputs.jsx
const STICKER_CATEGORIES = {
  "Reactions": ["😂", "💀", "😭", "🤡", "😎", "😡", "😱", "🤔", "🤫", "😴"],
  "Hands": ["👍", "👎", "👌", "✌️", "🤞", "🤟", "👊", "👏", "🙌", "🙏"],
  "Love": ["❤️", "💔", "💕", "💖", "😍", "😘", "🥰", "💌", "💘", "💝"],
  "Animals": ["🐈", "🐕", "🐸", "🙈", "🙉", "🙊", "🐵", "🦄", "🐔", "🐧"],
  "Objects": ["🔥", "💯", "✨", "🎉", "🍆", "🍑", "💩", "💣", "💎", "💰"]
};

export default function MemeStickerLibrary({ onAddSticker, onClose }) {
  const [activeTab, setActiveTab] = useState("emoji"); // 'emoji' | 'tenor'
  const [query, setQuery] = useState("");
  const [tenorStickers, setTenorStickers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Auto-fetch trending stickers when switching to Tenor tab
  useEffect(() => {
    if (activeTab === "tenor" && tenorStickers.length === 0) {
      handleTenorSearch("");
    }
  }, [activeTab]);

  const handleTenorSearch = async (searchTerm) => {
    setLoading(true);
    try {
      // ✅ Request 'sticker' type for transparent backgrounds
      const results = await searchTenor(searchTerm, 'sticker');
      setTenorStickers(results);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load stickers");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    e.target.value = ''; // Reset input
    if (onClose) onClose();

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
              const toastId = toast.loading("Removing background...", { style: { minWidth: '250px' } });
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
  };

  return (
    <div className="flex flex-col h-full max-h-[400px]">
      {/* Tabs */}
      <div className="p-3 border-b border-white/5 flex gap-2 shrink-0">
        <button
          onClick={() => setActiveTab("emoji")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "emoji" ? "bg-slate-700 text-white" : "hover:bg-slate-800 text-slate-400"
          }`}
        >
          <Smile className="w-4 h-4" /> Emojis
        </button>
        <button
          onClick={() => setActiveTab("tenor")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === "tenor" ? "bg-brand text-white shadow-lg shadow-brand/20" : "hover:bg-slate-800 text-slate-400"
          }`}
        >
          <ImageIcon className="w-4 h-4" /> Tenor
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {/* Custom Upload Button (Always visible) */}
        <div className="mb-4">
            <label className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 hover:text-white text-slate-400 rounded-xl cursor-pointer transition-all active:scale-95 group border-dashed">
            <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-wide">Upload Custom Sticker</span>
            <input 
                type="file" 
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleFileUpload}
            />
            </label>
        </div>

        {/* EMOJI TAB */}
        {activeTab === "emoji" && (
          <div className="space-y-4">
             {Object.entries(STICKER_CATEGORIES).map(([category, stickers]) => (
                <div key={category}>
                    <div className="px-1 py-2 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{category}</span>
                        <span className="h-px flex-1 bg-slate-800"></span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                        {stickers.map(sticker => (
                            <button 
                                key={sticker}
                                onClick={() => { onAddSticker(sticker, 'text'); if(onClose) onClose(); }}
                                className="h-10 flex items-center justify-center text-2xl hover:bg-slate-800 rounded-lg transition-all active:scale-75 hover:scale-110"
                            >
                                {sticker}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
          </div>
        )}

        {/* TENOR TAB */}
        {activeTab === "tenor" && (
          <div className="flex flex-col gap-4">
            <form onSubmit={(e) => { e.preventDefault(); handleTenorSearch(query); }} className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search stickers (e.g. 'cat', 'fire')..."
                className="w-full bg-slate-800 text-white text-sm rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-brand outline-none border border-slate-700"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </form>

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {tenorStickers.map((sticker) => (
                  <button
                    key={sticker.id}
                    onClick={() => { onAddSticker(sticker.url, 'image'); if(onClose) onClose(); }}
                    className="aspect-square relative bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700/50 hover:border-brand transition-all active:scale-95"
                  >
                    <img src={sticker.url} alt={sticker.name} className="w-full h-full object-contain p-1" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            {!loading && tenorStickers.length === 0 && <div className="text-center text-slate-500 text-xs">No stickers found.</div>}
          </div>
        )}
      </div>
    </div>
  );
}