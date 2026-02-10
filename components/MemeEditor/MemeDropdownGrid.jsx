import { useState } from "react";
import { TrendingUp, Search } from "lucide-react";

/**
 * Isolated meme dropdown grid — owns hoveredMeme state internally
 * so hover events don't trigger re-renders in the parent Main component.
 */
export default function MemeDropdownGrid({ filteredMemes, memeSearchQuery, onSelectMeme, dropdownRef }) {
  const [hoveredMeme, setHoveredMeme] = useState(null);

  return (
    <div
      ref={dropdownRef}
      data-meme-dropdown-portal
      className="card-bg border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2"
    >
      {!memeSearchQuery && (
        <div className="px-4 py-3 border-b border-[#2f3336] bg-[#181818]/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Popular Images</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium italic">Scroll to browse</span>
        </div>
      )}
      {memeSearchQuery && filteredMemes.length > 0 && (
        <div className="px-4 py-2 border-b border-[#2f3336] bg-brand/5">
          <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Search Results</span>
        </div>
      )}
      {filteredMemes.length === 0 ? (
        <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-3">
          <Search className="w-10 h-10 opacity-20" />
          <p>No images found for &ldquo;{memeSearchQuery}&rdquo;</p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto p-3 custom-scrollbar relative">
          <div className="grid grid-cols-3 gap-3">
            {filteredMemes.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  onSelectMeme(m);
                  setHoveredMeme(null);
                }}
                onMouseEnter={() => setHoveredMeme(m)}
                onMouseLeave={() => setHoveredMeme(null)}
                className="group relative aspect-square rounded-xl overflow-hidden bg-[#181818] border-2 border-transparent hover:border-brand transition-all active:scale-95 focus:outline-none focus:border-brand"
                title={m.name}
              >
                <img
                  src={`https://wsrv.nl/?url=${encodeURIComponent(m.url)}&w=300&h=300&fit=cover`}
                  alt={m.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  loading="lazy"
                  crossOrigin="anonymous"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <p className="text-[10px] text-white font-medium truncate w-full">
                    {m.name}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Floating Preview Pane (Visible on Large Screens) */}
          {hoveredMeme && (
            <div className="fixed left-[calc(100%+1rem)] top-0 w-64 p-3 card-bg border-2 border-brand rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 hidden xl:block z-[70] pointer-events-none">
              <div className="relative aspect-auto rounded-lg overflow-hidden border border-[#2f3336]">
                <img
                  src={`https://wsrv.nl/?url=${encodeURIComponent(hoveredMeme.url)}&w=600`}
                  className="w-full h-auto max-h-[400px] object-contain"
                  alt="Preview"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-sm font-bold text-white truncate">{hoveredMeme.name}</p>
                <p className="text-[10px] text-brand font-black uppercase tracking-widest opacity-80">Click to load Image</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
