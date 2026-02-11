import { useState } from "react";
import { TrendingUp, Search, Camera, Aperture, Loader2, ChevronDown, Video } from "lucide-react";

/**
 * Isolated meme/image dropdown grid — owns hoveredMeme state internally
 * so hover events don't trigger re-renders in the parent Main component.
 *
 * Supports three sources: imgflip (local), unsplash (API), pexels (API).
 */
export default function MemeDropdownGrid({
  filteredMemes,
  memeSearchQuery,
  onSelectMeme,
  dropdownRef,
  source = "imgflip",
  isLoading = false,
  hasMore = false,
  onLoadMore,
}) {
  const [hoveredMeme, setHoveredMeme] = useState(null);

  const isAPI = source === "unsplash" || source === "pexels" || source === "pexels_video";

  // Source-specific config
  const sourceConfig = {
    imgflip: {
      headerIcon: <TrendingUp className="w-4 h-4 text-brand" />,
      headerLabel: "Popular Memes",
      emptyIcon: <Search className="w-10 h-10 opacity-20" />,
      emptyPrefix: "No memes found for",
      attribution: null,
    },
    unsplash: {
      headerIcon: <Camera className="w-4 h-4 text-[#999]" />,
      headerLabel: "Unsplash Photos",
      emptyIcon: <Camera className="w-10 h-10 opacity-20" />,
      emptyPrefix: "No photos found for",
      attribution: (
        <a
          href="https://unsplash.com/?utm_source=meme_creator&utm_medium=referral"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          Powered by <span className="font-bold">Unsplash</span>
        </a>
      ),
    },
    pexels: {
      headerIcon: <Aperture className="w-4 h-4 text-[#05A081]" />,
      headerLabel: "Pexels Photos",
      emptyIcon: <Aperture className="w-10 h-10 opacity-20" />,
      emptyPrefix: "No photos found for",
      attribution: (
        <a
          href="https://www.pexels.com/?utm_source=meme_creator&utm_medium=referral"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          Powered by <span className="font-bold text-[#05A081]">Pexels</span>
        </a>
      ),
    },
    pexels_video: {
      headerIcon: <Video className="w-4 h-4 text-[#05A081]" />,
      headerLabel: "Pexels Videos",
      emptyIcon: <Video className="w-10 h-10 opacity-20" />,
      emptyPrefix: "No videos found for",
      attribution: (
        <a
          href="https://www.pexels.com/videos/?utm_source=meme_creator&utm_medium=referral"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          Powered by <span className="font-bold text-[#05A081]">Pexels</span>
        </a>
      ),
    },
  };

  const config = sourceConfig[source] || sourceConfig.imgflip;

  // For API sources, show prompt to type when no query
  if (isAPI && !memeSearchQuery) {
    return (
      <div
        ref={dropdownRef}
        data-meme-dropdown-portal
        className="card-bg border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2"
      >
        <div className="px-4 py-3 border-b border-[#2f3336] bg-[#181818]/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.headerIcon}
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{config.headerLabel}</span>
          </div>
          {config.attribution}
        </div>
        <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-3">
          {config.emptyIcon}
          <p className="text-sm">Type to search {source === "unsplash" ? "Unsplash" : source === "pexels" ? "Pexels photos" : source === "pexels_video" ? "Pexels videos" : "Pexels"}</p>
          <p className="text-[10px] text-slate-600">Millions of free, high-quality images</p>
        </div>
      </div>
    );
  }

  // Build the thumbnail URL — imgflip uses wsrv.nl proxy, others use native CDN thumbs
  const getThumbSrc = (m) => {
    if (m.thumbUrl) return m.thumbUrl;
    return `https://wsrv.nl/?url=${encodeURIComponent(m.url)}&w=300&h=300&fit=cover`;
  };

  return (
    <div
      ref={dropdownRef}
      data-meme-dropdown-portal
      className="card-bg border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2"
    >
      {/* Header */}
      {!memeSearchQuery && (
        <div className="px-4 py-3 border-b border-[#2f3336] bg-[#181818]/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.headerIcon}
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{config.headerLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            {config.attribution}
            <span className="text-[10px] text-slate-500 font-medium italic">Scroll to browse</span>
          </div>
        </div>
      )}
      {memeSearchQuery && filteredMemes.length > 0 && (
        <div className="px-4 py-2 border-b border-[#2f3336] bg-brand/5 flex items-center justify-between">
          <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Search Results</span>
          {config.attribution}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && filteredMemes.length === 0 ? (
        <div className="p-3">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-[#181818] animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        </div>
      ) : filteredMemes.length === 0 ? (
        /* Empty state */
        <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-3">
          {config.emptyIcon}
          <p>{config.emptyPrefix} &ldquo;{memeSearchQuery}&rdquo;</p>
        </div>
      ) : (
        /* Results grid */
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
                  src={getThumbSrc(m)}
                  alt={m.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  loading="lazy"
                  crossOrigin="anonymous"
                  style={m.color ? { backgroundColor: m.color } : undefined}
                />
                {/* Name + photographer overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  <p className="text-[10px] text-white font-medium truncate w-full">
                    {m.name}
                  </p>
                  {m.photographer && (
                    <p className="text-[8px] text-slate-400 truncate w-full">
                      by {m.photographer}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Load More button for paginated API sources */}
          {hasMore && (
            <button
              onClick={onLoadMore}
              disabled={isLoading}
              className="w-full mt-3 py-2.5 rounded-xl bg-[#181818] hover:bg-brand/20 border border-[#2f3336] hover:border-brand/50 text-sm font-bold text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              {isLoading ? "Loading..." : "Load More"}
            </button>
          )}

          {/* Floating Preview Pane (Visible on Large Screens) */}
          {hoveredMeme && (
            <div className="fixed left-[calc(100%+1rem)] top-0 w-64 p-3 card-bg border-2 border-brand rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 hidden xl:block z-[70] pointer-events-none">
              <div className="relative aspect-auto rounded-lg overflow-hidden border border-[#2f3336]">
                <img
                  src={hoveredMeme.thumbUrl || `https://wsrv.nl/?url=${encodeURIComponent(hoveredMeme.url)}&w=600`}
                  className="w-full h-auto max-h-[400px] object-contain"
                  alt="Preview"
                  crossOrigin="anonymous"
                  style={hoveredMeme.color ? { backgroundColor: hoveredMeme.color } : undefined}
                />
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-sm font-bold text-white truncate">{hoveredMeme.name}</p>
                {hoveredMeme.photographer && (
                  <p className="text-[10px] text-slate-400 truncate">
                    Photo by {hoveredMeme.photographer}
                  </p>
                )}
                <p className="text-[10px] text-brand font-black uppercase tracking-widest opacity-80">Click to load Image</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
