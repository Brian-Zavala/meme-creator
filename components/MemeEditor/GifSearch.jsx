import { Search, X, TrendingUp } from "lucide-react";

export function GifSearch({
  searchQuery,
  onSearchInput,
  onFocus,
  onClear,
  suggestions,
  showSuggestions,
  categories,
  onSelectSuggestion,
  onKeyDown,
  containerRef,
  placeholder = "Search GIFs..."
}) {
  return (
    <div className="relative z-50 mb-2" ref={containerRef}>
      <div className="relative">
        <input 
          type="text" 
          value={searchQuery} 
          onFocus={onFocus} 
          onChange={onSearchInput}
          onKeyDown={onKeyDown} 
          placeholder={placeholder} 
          className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-10 focus:ring-2 focus:ring-yellow-500 outline-none placeholder:text-xs md:placeholder:text-sm" 
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        {searchQuery && (
          <button onClick={onClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            {suggestions.length > 0 ? (
                <div className="p-2">{suggestions.map((t, i) => (
                    <button key={i} onClick={() => onSelectSuggestion(t)} className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-lg text-slate-300 flex items-center gap-2">
                        <TrendingUp className="w-3 h-3" /> {t}
                    </button>
                ))}
                </div>
            ) : categories.length > 0 && !searchQuery ? (
                <div className="p-2 grid grid-cols-2 gap-2">{categories.map((c, i) => (
                    <button key={i} onClick={() => onSelectSuggestion(c.searchterm)} className="relative h-16 rounded-lg overflow-hidden group">
                        <img 
                          src={`https://wsrv.nl/?url=${encodeURIComponent(c.image)}&w=200&h=100&fit=cover`} 
                          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = c.image;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors"><span className="text-white font-bold text-xs uppercase tracking-wider">{c.name}</span></div>
                    </button>
                ))}
                </div>
            ) : null}
        </div>
      )}
    </div>
  );
}
