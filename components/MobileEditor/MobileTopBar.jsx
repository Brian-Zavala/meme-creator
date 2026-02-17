import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  Undo2,
  Redo2,
  Download,
  MoreVertical,
  Share2,
  LayoutGrid,
  Film,
  Trash2,
  Sparkles,
  HelpCircle,
  Coffee,
} from "lucide-react";

const LAYOUTS = [
  { id: "single",       label: "Single" },
  { id: "top-bottom",   label: "Grid" },
  { id: "side-by-side", label: "Side" },
  { id: "grid-4",       label: "4-Grid" },
];

const MODES = [
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
];

export default function MobileTopBar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onUpload,
  onDownload,
  onShare,
  onRemoveAll,
  onRemoveEffects,
  onOpenInstructions,
  layout,
  onLayoutChange,
  mode,
  onModeChange,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [layoutExpanded, setLayoutExpanded] = useState(false);
  const [modeExpanded, setModeExpanded] = useState(false);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setLayoutExpanded(false);
        setModeExpanded(false);
      }
    }
    document.addEventListener("pointerdown", handleClick, true);
    return () => document.removeEventListener("pointerdown", handleClick, true);
  }, [menuOpen]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e) => {
      if (onUpload) onUpload(e);
    },
    [onUpload],
  );

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setLayoutExpanded(false);
    setModeExpanded(false);
  }, []);

  return (
    <>
      {/* Dark overlay behind menu */}
      {menuOpen && (
        <div
          className="mobile-top-bar-overlay"
          onClick={closeMenu}
          data-html2canvas-ignore="true"
        />
      )}

      <div className="mobile-top-bar lg:hidden" data-html2canvas-ignore="true">
        {/* Upload */}
        <button
          type="button"
          onClick={handleUploadClick}
          className="mobile-top-btn"
          aria-label="Upload image"
        >
          <Upload className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*"
          onChange={handleFileChange}
        />

        {/* Undo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="mobile-top-btn"
          aria-label="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Redo */}
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="mobile-top-btn"
          aria-label="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Save / Download */}
        <button
          type="button"
          onClick={onDownload}
          className="mobile-top-btn mobile-top-btn-primary"
          aria-label="Save"
        >
          <Download className="w-4 h-4" />
          <span className="text-xs font-semibold">Save</span>
        </button>

        {/* More menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((p) => !p)}
            className="mobile-top-btn"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {menuOpen && (
            <div className="mobile-more-menu">
              {/* App title */}
              <div className="mobile-more-app-title">MEME CREATOR</div>
              <div className="mobile-more-divider" />

              {/* Share */}
              <button
                type="button"
                className="mobile-more-item"
                onClick={() => {
                  closeMenu();
                  onShare?.();
                }}
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>

              <div className="mobile-more-divider" />

              {/* Layout */}
              <button
                type="button"
                className="mobile-more-item"
                onClick={() => {
                  setLayoutExpanded((p) => !p);
                  setModeExpanded(false);
                }}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Layout</span>
                <span className="ml-auto text-slate-500 text-xs">
                  {LAYOUTS.find((l) => l.id === layout)?.label || "Single"}
                </span>
              </button>
              {layoutExpanded && (
                <div className="mobile-more-sub">
                  {LAYOUTS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className="mobile-more-sub-item"
                      data-active={l.id === layout || undefined}
                      onClick={() => {
                        onLayoutChange?.(l.id);
                        closeMenu();
                      }}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Mode */}
              <button
                type="button"
                className="mobile-more-item"
                onClick={() => {
                  setModeExpanded((p) => !p);
                  setLayoutExpanded(false);
                }}
              >
                <Film className="w-4 h-4" />
                <span>Mode</span>
                <span className="ml-auto text-slate-500 text-xs">
                  {MODES.find((m) => m.id === mode)?.label || "Images"}
                </span>
              </button>
              {modeExpanded && (
                <div className="mobile-more-sub">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="mobile-more-sub-item"
                      data-active={m.id === mode || undefined}
                      onClick={() => {
                        onModeChange?.(m.id);
                        closeMenu();
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="mobile-more-divider" />

              {/* Instructions */}
              <button
                type="button"
                className="mobile-more-item"
                onClick={() => {
                  closeMenu();
                  onOpenInstructions?.();
                }}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Instructions</span>
              </button>

              {/* Donate */}
              <a
                href="https://www.buymeacoffee.com/memecreatorapp"
                target="_blank"
                rel="noopener noreferrer"
                className="mobile-more-item text-yellow-400"
                onClick={closeMenu}
              >
                <Coffee className="w-4 h-4" />
                <span>Buy me a coffee</span>
              </a>

              <div className="mobile-more-divider" />

              {/* Remove All */}
              <button
                type="button"
                className="mobile-more-item text-red-400"
                onClick={() => {
                  closeMenu();
                  onRemoveAll?.();
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove All</span>
              </button>

              {/* Remove Effects */}
              <button
                type="button"
                className="mobile-more-item text-teal-400"
                onClick={() => {
                  closeMenu();
                  onRemoveEffects?.();
                }}
              >
                <Sparkles className="w-4 h-4" />
                <span>Remove Effects</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
