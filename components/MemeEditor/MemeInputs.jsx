import { useState, useEffect, useRef, useTransition } from "react";
import { Type, Sparkles, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { MemeStickerSection } from "./MemeStickerSection";
import LottieAnimation from "../Animations/LottieAnimation";

// Preload the animation JSON to prevent pop-in on re-render
const WALKING_PENCIL_SRC = "/animations/walking-pencil.json";

export default function MemeInputs({ texts, handleTextChange, onAddSticker, onMagicCaption, isMagicGenerating, onChaos, hasStickers, onExportStickers, selectedId, editingId, onEditingChange, embedded = false, hasText = false }) {
  const [isPending, startTransition] = useTransition();

  // Preload animation on mount to ensure it's cached
  useEffect(() => {
    // Add preload link to document head
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'fetch';
    preloadLink.href = WALKING_PENCIL_SRC;
    preloadLink.crossOrigin = 'anonymous';
    document.head.appendChild(preloadLink);

    // Also fetch to ensure it's in browser cache
    fetch(WALKING_PENCIL_SRC).catch(() => {});

    return () => {
      if (document.head.contains(preloadLink)) {
        document.head.removeChild(preloadLink);
      }
    };
  }, []);
  // Track which text IDs have been rendered before to prevent re-animation
  const renderedIdsRef = useRef(new Set());
  const inputRefs = useRef({});

  // When editingId changes, focus the corresponding input without scrolling
  // Focus the input when editingId changes (not on selection - that shows the toolbar first)
  useEffect(() => {
    if (editingId && inputRefs.current[editingId]) {
      // Don't steal focus if user is already typing in the on-canvas direct input
      const currentActiveId = document.activeElement?.id || "";
      const isDirectlyEditingOnCanvas = currentActiveId.startsWith('canvas-input-');

      if (!isDirectlyEditingOnCanvas) {
        inputRefs.current[editingId].focus({ preventScroll: true });
      }
    }
  }, [editingId]);

  return (
    <div className={`flex flex-col relative transition-all duration-300 z-40 ${embedded ? '' : 'card-bg rounded-2xl border border-white/5 shadow-xl backdrop-blur-sm'}`}>
      {/* Header with Magic AI */}
      <div className="flex items-center justify-between p-6 pb-2">
        <div className="flex items-center gap-2 text-slate-400 uppercase text-xs font-bold tracking-wider" aria-hidden="true">
          <Type className="w-4 h-4" /> Content
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => startTransition(() => onMagicCaption())}
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
      </div>

      {/* Scrolling Text Inputs area */}
      <div className="px-6 py-2 space-y-4 max-h-[300px] overflow-y-auto pr-4 scrollbar-thin mb-4" role="group" aria-label="Text Inputs">
        {(() => {
          let lastFilledIndex = -1;
          let activeIndex = -1;

          for (let i = texts.length - 1; i >= 0; i--) {
            if ((texts[i].content || "").trim().length > 0) {
              lastFilledIndex = i;
              break;
            }
          }

          // Find the index of the selected or editing text (for newly created empty texts)
          const activeId = editingId || selectedId;
          if (activeId) {
            activeIndex = texts.findIndex(t => t.id === activeId);
          }

          // Show at least 2 inputs, or up to lastFilledIndex + 2, or up to the active one
          const visibleCount = Math.min(
            Math.max(lastFilledIndex + 2, activeIndex + 1, 2),
            texts.length
          );

          return texts.slice(0, visibleCount).map((textItem, index) => {
            const isSelected = textItem.id === selectedId;
            const isEditing = textItem.id === editingId;
            const isActive = isSelected || isEditing;

            // Check if this is a new item that hasn't been rendered before
            const isNew = !renderedIdsRef.current.has(textItem.id);
            // Mark as rendered after first display
            if (isNew) {
              renderedIdsRef.current.add(textItem.id);
            }

            return (
              <div
                key={textItem.id}
                className={`relative group ${isNew ? 'animate-text-entry' : ''} ${isActive ? 'ring-2 ring-brand rounded-xl' : ''}`}
              >
                <label htmlFor={`text-input-${textItem.id}`} className="sr-only">
                  {index === 0 ? "Top Text" : index === 1 ? "Bottom Text" : `Text line ${index + 1}`}
                </label>
                <input
                  id={`text-input-${textItem.id}`}
                  ref={(el) => (inputRefs.current[textItem.id] = el)}
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="sentences"
                  enterKeyHint="done"
                  placeholder={isActive && !textItem.content ? "Type here..." : index === 0 ? "Top Text" : index === 1 ? "Bottom Text" : `Text #${index + 1}`}
                  aria-label={index === 0 ? "Top Text Input" : index === 1 ? "Bottom Text Input" : `Text Input ${index + 1}`}
                  className={`w-full bg-[#181818] text-white border border-[#2f3336] rounded-xl px-4 py-3 text-lg transition-all placeholder:text-slate-500 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 ${isActive ? 'bg-brand/10 !border-brand/50 placeholder:text-brand/70' : ''}`}
                  onChange={(e) => handleTextChange(textItem.id, e.target.value)}
                  onFocus={() => {
                    // Always set editingId when focusing an input - this keeps drawer collapsed
                    if (onEditingChange) onEditingChange(textItem.id);
                  }}
                  onBlur={() => {
                    // Only clear editing state if we're not clicking another input (handled by new focus)
                    // We can rely on handleCanvasPointerDown to clear it when clicking away
                  }}
                  value={textItem.content}
                />
                <div className="absolute right-3 top-3.5 text-slate-500 pointer-events-none text-xs bg-[#0f0f0f] px-2 py-0.5 rounded uppercase" aria-hidden="true">
                  {isActive ? "NEW" : index === 0 ? "TOP" : index === 1 ? "BOTTOM" : `#${index + 1}`}
                </div>
              </div>
            );
          });
        })()}
      </div>


      <div className="px-6 pb-6 hidden lg:block">
        <div className="pt-4 border-t border-white/5">
          <MemeStickerSection
            onAddSticker={onAddSticker}
            hasStickers={hasStickers}
            onExportStickers={onExportStickers}
          />
        </div>

        {/* Walking Pencil Animation - Only show when no text on canvas */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${
            hasText ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
          }`}
        >
          <div className={hasText ? "overflow-hidden" : ""}>
            <div
              className={`group/pencil flex flex-col items-center justify-center pt-32 pb-12 cursor-pointer transition-all duration-300 ${hasText ? 'opacity-0' : 'opacity-100'}`}
            >
              {/* Animation container with hover effects */}
              <div className="relative transition-transform duration-500 ease-out group-hover/pencil:scale-110 group-hover/pencil:-translate-y-2">
                {/* Soft glow effect on hover - radial gradient fades to transparent */}
                <div
                  className="absolute -inset-16 opacity-0 transition-opacity duration-500 group-hover/pencil:opacity-100 pointer-events-none blur-3xl"
                  style={{
                    background: 'radial-gradient(circle, rgba(255, 199, 0, 0.2) 0%, rgba(255, 199, 0, 0.05) 40%, transparent 65%)',
                  }}
                />
                <LottieAnimation
                  src={WALKING_PENCIL_SRC}
                  className="w-56 h-56 relative z-10"
                  loop={true}
                  autoplay={true}
                  style={{ filter: 'drop-shadow(0 4px 12px rgba(255, 199, 0, 0.15))' }}
                />
              </div>
              {/* Text with hover color transition */}
              <p className="text-xs text-slate-500 mt-6 text-center uppercase tracking-wider font-medium transition-all duration-300 group-hover/pencil:text-brand group-hover/pencil:tracking-widest">
                Start typing to create your meme
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
}
