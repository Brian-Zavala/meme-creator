import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  ArrowCounterClockwise,
  ArrowClockwise,
  DownloadSimple,
  DotsThreeVertical,
  ShareNetwork,
  SquaresFour,
  FilmSlate,
  Trash,
  Sparkle,
  Question,
  Coffee,
} from "@phosphor-icons/react";

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
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
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

      <div className="mobile-top-bar flex items-center gap-1 lg:hidden" data-html2canvas-ignore="true">
        {/* Upload */}
        <button
          type="button"
          onClick={handleUploadClick}
          className="mobile-top-btn"
          aria-label="Upload image"
        >
          <Upload size={20} />
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
          <ArrowCounterClockwise size={17} />
        </button>

        {/* Redo */}
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="mobile-top-btn"
          aria-label="Redo"
        >
          <ArrowClockwise size={17} />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Save / Download */}
        <button
          type="button"
          onClick={onDownload}
          className="mobile-top-btn mobile-top-btn-action"
          aria-label="Save"
        >
          <DownloadSimple size={20} />
        </button>

        {/* Share */}
        <button
          type="button"
          onClick={onShare}
          className="mobile-top-btn mobile-top-btn-action"
          aria-label="Share"
        >
          <ShareNetwork size={20} />
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
            <DotsThreeVertical size={20} />
          </button>

          {menuOpen && (
            <div className="mobile-more-menu">
              {/* App title */}
              <div className="mobile-more-app-title">MEME CREATOR</div>
              <div className="mobile-more-divider" />


              {/* Layout */}
              <div className="mobile-more-section">
                <div className="mobile-more-section-label">
                  <SquaresFour size={14} />
                  <span>Layout</span>
                </div>
                <div className="mobile-more-segment">
                  {LAYOUTS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className="mobile-more-segment-btn"
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
              </div>

              {/* Mode */}
              <div className="mobile-more-section">
                <div className="mobile-more-section-label">
                  <FilmSlate size={14} />
                  <span>Mode</span>
                </div>
                <div className="mobile-more-segment">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="mobile-more-segment-btn"
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
              </div>

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
                <Question size={17} />
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
                <Coffee size={17} />
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
                <Trash size={17} />
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
                <Sparkle size={17} weight="duotone" />
                <span>Remove Effects</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
