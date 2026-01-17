import { Search, X, TrendingUp } from "lucide-react";
import { createPortal } from "react-dom";
import { useState, useEffect, useRef, useLayoutEffect } from "react";

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
  const inputContainerRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  // Calculate dropdown position based on input container
  useLayoutEffect(() => {
    if (showSuggestions && inputContainerRef.current) {
      const rect = inputContainerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        zIndex: 9999
      });
    }
  }, [showSuggestions]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!showSuggestions) return;

    const updatePosition = () => {
      if (inputContainerRef.current) {
        const rect = inputContainerRef.current.getBoundingClientRect();
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          zIndex: 9999
        });
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showSuggestions]);

  const dropdownContent = showSuggestions && (
    <div
      style={dropdownStyle}
      className="card-bg border border-[#2f3336] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95"
      role="listbox"
      aria-label="Search Suggestions"
    >
      {suggestions.length > 0 ? (
        <div className="p-2" role="group">
          {suggestions.map((t, i) => (
            <button
              key={i}
              onClick={() => onSelectSuggestion(t)}
              role="option"
              className="w-full text-left px-3 py-2 hover:bg-[#222222] rounded-lg text-slate-300 flex items-center gap-2"
            >
              <TrendingUp className="w-3 h-3" /> {t}
            </button>
          ))}
        </div>
      ) : categories.length > 0 && !searchQuery ? (
        <div className="p-2 grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar" role="group">
          {categories.map((c, i) => (
            <button
              key={i}
              onClick={() => onSelectSuggestion(c.searchterm)}
              role="option"
              className="relative h-16 rounded-lg overflow-hidden group"
            >
              <img
                src={`https://wsrv.nl/?url=${encodeURIComponent(c.image)}&w=200&h=100&fit=cover`}
                alt={c.name}
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                crossOrigin="anonymous"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = c.image;
                }}
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                <span className="text-white font-bold text-xs uppercase tracking-wider">{c.name}</span>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="relative mb-2" ref={(node) => {
      // Support both containerRef (from parent) and local ref
      inputContainerRef.current = node;
      if (containerRef) {
        if (typeof containerRef === 'function') {
          containerRef(node);
        } else {
          containerRef.current = node;
        }
      }
    }} role="search">
      <div className="relative">
        <input
          id="gif-search-input"
          name="gif-search"
          type="text"
          value={searchQuery}
          onFocus={onFocus}
          onChange={onSearchInput}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Search for GIFs"
          className="w-full input-field py-3 pl-10 pr-24 placeholder:text-xs md:placeholder:text-sm"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />

        {/* Attribution: Always visible on right */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
          <img src="/giphy/giphy-attribution-marks/Giphy Attribution Marks/Static Logos/Small/Light Backgrounds/PoweredBy_200px-White_HorizLogo.png" alt="Powered by Giphy" className="h-4 opacity-70" />
        </div>

        {searchQuery && (
          <button onClick={onClear} aria-label="Clear Search" className="absolute right-24 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Portal dropdown to document.body to avoid z-index/stacking issues */}
      {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </div>
  );
}
