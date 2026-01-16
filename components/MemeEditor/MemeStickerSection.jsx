import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, HelpCircle, Smile } from "lucide-react";
import toast from "react-hot-toast";
import MemeStickerLibrary from "./MemeStickerLibrary";

export function MemeStickerSection({ onAddSticker, hasStickers, onExportStickers }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 400;

        // Check if dropdown would overflow bottom of viewport
        const spaceBelow = viewportHeight - rect.bottom;
        const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

        setDropdownStyle({
          position: 'fixed',
          left: rect.left,
          width: rect.width + 48 + 8, // button width + help button + gap
          zIndex: 9999, // Super high z-index
          ...(openUpward
            ? { bottom: viewportHeight - rect.top + 8, top: 'auto' }
            : { top: rect.bottom + 8, bottom: 'auto' }
          ),
        });
      };

      updatePosition();
      // Update on scroll/resize to keep attached
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is inside dropdown or button
      const isDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
      const isButton = buttonRef.current && buttonRef.current.contains(event.target);

      if (!isDropdown && !isButton) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

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
    <div className="relative">
      <div className="flex gap-2">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-label="Add Sticker Menu"
          className={`flex-1 flex items-center justify-between select-trigger px-4 py-3 group focus:outline-none focus:ring-2 focus:ring-yellow-500 ${isOpen ? 'ring-2 ring-brand border-transparent' : ''}`}
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
          className="w-12 btn-icon focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
          className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[#2f3336] bg-[#181818] text-slate-400 hover:text-white hover:border-brand/50 hover:bg-brand/5 transition-all text-xs font-bold uppercase tracking-wider group"
        >
          <Smile className="w-4 h-4 group-hover:text-brand transition-colors" />
          <span>Export Stickers Only</span>
        </button>
      )}

      {/* Use Portal for Dropdown */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="card-bg border border-[#2f3336] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 origin-top h-[400px]"
          role="menu"
          aria-label="Sticker Categories"
        >
          <MemeStickerLibrary
            onAddSticker={onAddSticker}
            onClose={() => setIsOpen(false)}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
