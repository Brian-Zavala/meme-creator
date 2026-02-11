import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Smile, Search, Loader2, Image as ImageIcon, Upload, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { searchGiphy } from "../../services/giphy";
import { removeImageBackground } from "../../services/backgroundRemover";

/**
 * Lightweight virtualized grid for emojis
 * Only renders visible items + buffer, dramatically reducing DOM nodes from 600+ to ~50
 */
function VirtualizedEmojiGrid({ stickers, onAddSticker, onClose, columns = 5, rowHeight = 40, bufferRows = 3 }) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  // Calculate grid dimensions
  const totalRows = Math.ceil(stickers.length / columns);
  const totalHeight = totalRows * rowHeight;

  // Update container height on mount and resize
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateHeight = () => setContainerHeight(container.clientHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Calculate visible range with buffer
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferRows);
  const visibleRows = Math.ceil(containerHeight / rowHeight) + bufferRows * 2;
  const endRow = Math.min(totalRows, startRow + visibleRows);

  const startIndex = startRow * columns;
  const endIndex = Math.min(stickers.length, endRow * columns);
  const visibleStickers = stickers.slice(startIndex, endIndex);

  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto scrollbar-thin"
      style={{ height: '100%', maxHeight: '300px' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          className="grid grid-cols-5 gap-1 absolute left-0 right-0"
          style={{ top: startRow * rowHeight }}
        >
          {visibleStickers.map((sticker, index) => (
            <button
              key={`${sticker}-${startIndex + index}`}
              onClick={() => { onAddSticker(sticker, 'text'); if (onClose) onClose(); }}
              className="h-10 flex items-center justify-center text-2xl hover:bg-[#222222] rounded-lg transition-all active:scale-75 hover:scale-110"
              style={{ touchAction: 'manipulation' }}
            >
              {sticker}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Flattened emoji data for virtualization - computed once at module load
 * This avoids recalculating on every render
 */
const FLATTENED_EMOJIS = (() => {
  const result = [];
  // We'll create a flat list with category headers as special items
  return result;
})();

/**
 * Virtualized emoji categories with headers
 * Uses intersection observer for lazy category loading
 */
function VirtualizedEmojiCategories({ categories, onAddSticker, onClose }) {
  const containerRef = useRef(null);
  const [visibleCategories, setVisibleCategories] = useState(new Set(['Faces', 'Gestures'])); // Start with first 2

  // Lazy load categories as user scrolls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const categoryNames = Object.keys(categories);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const categoryIndex = parseInt(entry.target.dataset.categoryIndex, 10);
            // Load this category and next 2
            setVisibleCategories(prev => {
              const next = new Set(prev);
              for (let i = categoryIndex; i < Math.min(categoryIndex + 3, categoryNames.length); i++) {
                next.add(categoryNames[i]);
              }
              return next;
            });
          }
        });
      },
      { root: container, rootMargin: '100px' }
    );

    // Observe sentinel elements for each category
    container.querySelectorAll('[data-category-sentinel]').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categories]);

  const categoryEntries = Object.entries(categories);

  return (
    <div
      ref={containerRef}
      className="space-y-4 overflow-y-auto scrollbar-thin"
      style={{ maxHeight: '300px', WebkitOverflowScrolling: 'touch' }}
    >
      {categoryEntries.map(([category, stickers], categoryIndex) => (
        <div key={category} data-category-sentinel data-category-index={categoryIndex}>
          <div className="px-1 py-2 flex items-center gap-2 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-10">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{category}</span>
            <span className="h-px flex-1 bg-[#2f3336]"></span>
          </div>
          {visibleCategories.has(category) ? (
            <div className="grid grid-cols-5 gap-1">
              {stickers.map((sticker, index) => (
                <button
                  key={`${sticker}-${index}`}
                  onClick={() => { onAddSticker(sticker, 'text'); if (onClose) onClose(); }}
                  className="h-10 flex items-center justify-center text-2xl hover:bg-[#222222] rounded-lg transition-all active:scale-75 hover:scale-110"
                  style={{ touchAction: 'manipulation' }}
                >
                  {sticker}
                </button>
              ))}
            </div>
          ) : (
            // Placeholder to maintain scroll height
            <div
              className="grid grid-cols-5 gap-1"
              style={{ height: Math.ceil(stickers.length / 5) * 40 }}
            >
              <div className="col-span-5 flex items-center justify-center text-slate-600 text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Moved from MemeInputs.jsx
const STICKER_CATEGORIES = {
  "Faces": [
    "😂", "💀", "😭", "🤡", "😎", "😡", "😱", "🤔", "🤫", "😴",
    "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😇", "🙂", "🙃",
    "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛",
    "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😏", "😒", "😞", "😔",
    "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢",
    "😤", "😠", "🤬", "🤯", "😳", "🥵", "🥶", "😓", "🤗", "😲",
    "🙄", "😬", "🤥", "😶", "😐", "😑", "😯", "😦", "😧", "😮",
    "😲", "🥱", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧",
    "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "👻",
    "👽", "👾", "🤖", "💩", "😺", "😸", "😹", "😻", "😼", "😽",
    "🙀", "😿", "😾"
  ],
  "Gestures": [
    "👍", "👎", "👌", "✌️", "🤞", "🤟", "👊", "👏", "🙌", "🙏",
    "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋",
    "🤙", "💪", "🖕", "✍️", "🤳", "💅", "🤝", "🤲", "👐", "✊",
    "🤛", "🤜", "🤏", "🤌", "🙅", "🙆", "💁", "🙋", "🙇", "🤦",
    "🤷", "🙎", "🙍", "💇", "💆", "🧖", "💅", "💃", "🕺", "👯"
  ],
  "Love & Hearts": [
    "❤️", "💔", "💕", "💖", "😍", "😘", "🥰", "💌", "💘", "💝",
    "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💓", "💗",
    "💞", "💟", "❣️", "💋", "💏", "💑", "💍", "💎", "💐", "🌹"
  ],
  "Animals": [
    "🐈", "🐕", "🐸", "🙈", "🙉", "🙊", "🐵", "🦄", "🐔", "🐧",
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
    "🦁", "cow", "🐷", "🐽", "🐗", "🐵", "🐒", "🐴", "🐎", "🦓",
    "🦌", "🦒", "🐘", "🦏", "🦛", "🐀", "🐁", "🐿️", "🦔", "🦇",
    "🐓", "🐣", "🐤", "🐥", "🐦", "🦅", "🦆", "🦢", "🦉", "🦩",
    "🦚", "🦜", "🐊", "🐢", "🦎", "🐍", "🐲", "🐉", "🦕", "🦖",
    "🐳", "🐋", "🐬", "🐟", "🐠", "🐡", "🦈", "🐙", "🐚", "🐌",
    "🦋", "🐛", "🐜", "🐝", "🐞", "🦗", "🕷️", "🕸️", "🦂", "🦟"
  ],
  "Food": [
    "🍎", "🍌", "🍒", "🍇", "🍉", "🍓", "🍑", "🍍", "🥭", "🥑",
    "🍆", "🥔", "🥕", "🌽", "🌶️", "🥒", "🥬", "🥦", "🍄", "🥜",
    "🍞", "🥐", "🥖", "🥨", "🥯", "🥞", "🧇", "🧀", "🍖", "🍗",
    "🥩", "🥓", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🥙",
    "🥚", "🍳", "🥘", "🍲", "🥣", "🥗", "🍿", "🧈", "🧂", "🥫",
    "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", "🍝", "🍠", "🍢", "🍣",
    "🍤", "🍥", "🥮", "🍡", "🥟", "🥠", "🥡", "🦀", "🦞", "🦐",
    "🦑", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧",
    "🍫", "🍬", "🍭", "🍮", "🍯", "🍼", "🥛", "☕", "🍵", "🍶",
    "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🥤", "🧃"
  ],
  "Activities": [
    "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱",
    "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🥅", "⛳", "🪁",
    "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️",
    "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "⛹️", "🤺",
    "🤾", "🏌️", "🏇", "🧘", "🏄", "🏊", "🤽", "🚣", "🧗", "🚵",
    "🚴", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🏵️", "🎗️", "🎫",
    "🎟️", "🎪", "🤹", "🎭", "🩰", "🎨", "🎬", "🎤", "🎧", "🎼",
    "🎹", "🥁", "🎷", "🎺", "🎸", "🪕", "🎻", "🎲", "♟️", "🎯",
    "🎳", "🎮", "🎰", "🧩"
  ],
  "Travel": [
    "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐",
    "🚚", "🚛", "🚜", "🏍️", "🛵", "🦽", "🦼", "🚲", "🛴", "🛹",
    "🚨", "🚔", "🚍", "🚘", "🚖", "🚡", "🚠", "🚟", "🚃", "🚋",
    "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉",
    "✈️", "🛫", "🛬", "🛩️", "💺", "🛰️", "🚀", "🛸", "🚁", "🛶",
    "⛵", "🚤", "🛥️", "🛳️", "⛴️", "🚢", "⚓", "🚧", "⛽", "🚏",
    "🚦", "🚥", "🗺️", "🗿", "🗽", "🗼", "🏰", "🏯", "🏟️", "🎡",
    "🎢", "🎠", "⛲", "⛱️", "🏖️", "🏝️", "🏜️", "🌋", "⛰️", "🏔️",
    "🗻", "🏕️", "⛺", "🏠", "🏡", "🏘️", "🏚️", "🏗️", "🏭", "🏢",
    "🏬", "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "💒",
    "🏛️", "⛪", "🕌", "🕍", "🛕", "🕋", "⛩️", "🛤️", "🛣️"
  ],
  "Objects": [
    "🔥", "💯", "✨", "🎉", "🍆", "🍑", "💩", "💣", "💎", "💰",
    "⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️",
    "🗜️", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥",
    "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️",
    "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋",
    "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴",
    "💶", "💷", "🪙", "💳", "🧾", "🛍️", "🛒", "🧴", "🧼", "🧽",
    "🧹", "🧺", "🧻", "🚽", "🚰", "🚿", "🛁", "🛀", "🔑", "🗝️",
    "🚪", "🪑", "🛋️", "🛏️", "🛌", "🧸", "🪆", "🖼️", "🪞", "🪟",
    "👑", "🎩", "👒", "🧢", "⛑️", "📿", "💄", "💍", "🌂", "☂️"
  ],
  "Symbols": [
    "🛑", "🚫", "📛", "🔞", "📵", "🚭", "🚳", "🚱", "🚷", "📵",
    "⚠️", "🚸", "⛔", "♻️", "✅", "❇️", "✳️", "❎", "🌐", "💠",
    "Ⓜ️", "🏧", "🚾", "♿", "🅿️", "🛗", "🚹", "🚺", "🚻", "🚼",
    "🚻", "🚮", "🎦", "📶", "🈁", "🆖", "🆗", "🆙", "🆒", "🆕",
    "🆓", "0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣",
    "8️⃣", "9️⃣", "🔟", "🔢", "#️⃣", "*️⃣", "⏏️", "▶️", "⏸️", "⏯️",
    "⏹️", "⏺️", "⏭️", "⏮️", "⏩", "⏪", "⏫", "⏬", "◀️", "🔼",
    "🔽", "➡️", "⬅️", "⬆️", "⬇️", "↗️", "↘️", "↙️", "↖️", "↕️",
    "↔️", "↪️", "↩️", "⤴️", "⤵️", "🔀", "🔁", "🔂", "🔄", "🔃",
    "🎵", "🎶", "➕", "➖", "➗", "✖️", "💲", "💱", "™️", "©️",
    "®️", "〰️", "➰", "➿", "🔚", "🔙", "🔛", "🔝", "🔜", "✔️",
    "☑️", "🔘", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪",
    "🟤", "🔺", "🔻", "🔸", "🔹", "🔶", "🔷", "🔳", "🔲", "▪️",
    "▫️", "◾", "◽", "◼️", "◻️", "🟥", "🟧", "🟨", "🟩", "🟦",
    "🟪", "⬛", "⬜", "🟫", "🔈", "🔇", "🔉", "🔊", "🔔", "🔕",
    "📣", "📢", "👁️‍🗨️", "💬", "💭", "🗯️", "♠️", "♣️", "♥️", "♦️",
    "🃏", "🎴", "🀄", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖",
    "🕗", "🕘", "🕙", "🕚", "🕛", "🕜", "🕝", "🕞", "🕟", "🕠",
    "🕡", "🕢", "🕣", "🕤", "🕥", "🕦", "🕧"
  ]
};

export default function MemeStickerLibrary({ onAddSticker, onClose }) {
  const [activeTab, setActiveTab] = useState("tenor"); // 'tenor' | 'emoji'
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
      const results = await searchGiphy(searchTerm, 'sticker');
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

    const isGif = file.type === 'image/gif';

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
                // Pass Blob directly! Main.jsx handles ObjectURL + sourceBlob storage
                onAddSticker(blob, 'image', false, blob);
                toast.success("Background removed!", { id: toastId });

              } catch (err) {
                console.error(err);
                toast.error("Failed. Using original.", { id: toastId });
                // Fallback to original file
                onAddSticker(file, 'image', isGif, file);
              }
            }}
            className="flex-1 bg-brand text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg shadow-brand/20 hover:bg-brand-dark transition-colors"
          >
            Yes, Magic
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              // Pass original file directly
              onAddSticker(file, 'image', isGif, file);
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
          onClick={() => setActiveTab("tenor")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "tenor" ? "bg-brand text-white shadow-lg shadow-brand/20" : "hover:bg-[#222222] text-slate-400"
            }`}
        >
          <ImageIcon className="w-4 h-4" /> Giphy
        </button>
        <button
          onClick={() => setActiveTab("emoji")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === "emoji" ? "bg-brand text-white shadow-lg shadow-brand/20" : "hover:bg-[#222222] text-slate-400"
            }`}
        >
          <Smile className="w-4 h-4" /> Emojis
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Custom Upload Button (Always visible) */}
        <div className="mb-4">
          <label className="flex items-center justify-center gap-2 w-full py-3 bg-[#181818]/50 hover:bg-[#222222] border border-[#2f3336] hover:border-[#3e4347] hover:text-white text-slate-400 rounded-xl cursor-pointer transition-all active:scale-95 group border-dashed">
            <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-wide">Upload Custom Sticker</span>
            <input
              id="sticker-upload-input"
              name="sticker-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* TENOR TAB */}
        {activeTab === "tenor" && (
          <div className="flex flex-col gap-4">
            <form onSubmit={(e) => { e.preventDefault(); handleTenorSearch(query); }} className="relative mb-2">
              <input
                id="sticker-search-input"
                name="sticker-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search stickers..."
                className="w-full input-field text-sm py-3 pl-10 pr-24"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <img
                src="/giphy/giphy-attribution-marks/Giphy Attribution Marks/Static Logos/Small/Light Backgrounds/PoweredBy_200px-White_HorizLogo.png"
                alt="Powered by Giphy"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 opacity-70 pointer-events-none"
              />
            </form>

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {tenorStickers.map((sticker) => (
                  <button
                    key={sticker.id}
                    onClick={() => { onAddSticker(sticker.url, 'image', true); if (onClose) onClose(); }}
                    className="aspect-square relative bg-[#181818]/50 rounded-lg overflow-hidden border border-[#2f3336]/50 hover:border-brand transition-all active:scale-95 group"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <img
                      src={`https://wsrv.nl/?url=${encodeURIComponent(sticker.url)}&w=150&h=150&fit=contain&n=-1`}
                      alt={sticker.name}
                      className="w-full h-full object-contain p-1 transition-transform group-hover:scale-110"
                      loading="lazy"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = sticker.url;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
            {!loading && tenorStickers.length === 0 && <div className="text-center text-slate-500 text-xs">No stickers found.</div>}


          </div>
        )}

        {/* EMOJI TAB - Virtualized for performance (600+ emojis) */}
        {activeTab === "emoji" && (
          <VirtualizedEmojiCategories
            categories={STICKER_CATEGORIES}
            onAddSticker={onAddSticker}
            onClose={onClose}
          />
        )}

      </div>
    </div>
  );
}
