import { useState, useEffect, useRef, useTransition } from "react";
import { Type, Loader2, RefreshCw, LayoutGrid, Brain } from "lucide-react";
import toast from "react-hot-toast";
import { MemeStickerSection } from "./MemeStickerSection";
import LottieAnimation from "../Animations/LottieAnimation";

// Preload the animation JSON to prevent pop-in on re-render
const WALKING_PENCIL_SRC = "/animations/walking-pencil.json";

export default function MemeInputs({ texts, handleTextChange, onTextCommit, onAddSticker, onMagicCaption, isMagicGenerating, onVibeShift, isVibeShifting, onAutoLayout, isAutoLayouting, onMemeIQ, isMemeIQing, onStyleDna, isStyleDnaing, onEmojiSauce, isEmojiSaucing, onChaos, hasStickers, onExportStickers, selectedId, editingId, onEditingChange, embedded = false, hasText = false }) {
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
    <div className={`flex flex-col relative transition-all duration-300 z-40 overflow-visible ${embedded ? '' : 'card-bg rounded-2xl border border-white/5 shadow-xl backdrop-blur-sm'}`}>
      {/* AI Creative Toolbar - Premium Frosted Glass Panel */}
      <div className="mx-6 mt-4 p-1.5 rounded-2xl bg-[#0f0f0f]/50 border border-white/5 backdrop-blur-xl shadow-2xl flex flex-wrap gap-2 items-center justify-between relative overflow-hidden group/ai-bar">
        {/* Subtle animated background sheen */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/ai-bar:animate-shimmer pointer-events-none" />

        {/* Left Side: Magic AI (Hero Button) */}
        <button
          onClick={() => startTransition(() => onMagicCaption())}
          disabled={isMagicGenerating}
          className={`relative flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 group/magic overflow-hidden ${
            isMagicGenerating
              ? 'bg-neutral-800 cursor-not-allowed opacity-80'
              : 'bg-brand hover:bg-brand-dark hover:scale-[1.02] hover:shadow-[0_0_20px_oklch(53%_0.187_39_/_0.4)] active:scale-[0.98]'
          }`}
          title="Generate Magic Caption with AI"
        >
          {/* Animated Noise Texture Overlay */}
          <div className="absolute inset-0 opacity-20 bg-[url('/images/noise.png')] mix-blend-overlay pointer-events-none" />

          {/* Button Content */}
          <div className="relative z-10 flex items-center gap-2">
            {isMagicGenerating ? (
              <Loader2 className="w-4 h-4 text-white/70 animate-spin" />
            ) : (
              <span className="text-xl group-hover/magic:rotate-12 transition-transform duration-300 filter drop-shadow-md">👾</span>
            )}
            <div className="flex flex-col items-start leading-none">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isMagicGenerating ? 'text-neutral-400' : 'text-yellow-300'}`}>
                {isMagicGenerating ? "Thinking..." : "Magic AI"}
              </span>
              {!isMagicGenerating && (
                <span className="text-[10px] font-medium text-white/90">Auto-Caption</span>
              )}
            </div>
          </div>

          {/* Shine effect */}
          {!isMagicGenerating && (
            <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover/magic:animate-shine" />
          )}
        </button>

        {/* Right Side: Tool Actions Group (Dynamic Flex) */}
        <div className="flex-1 flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 min-w-[200px]">
          {/* Vibe Shift */}
          <button
            onClick={() => startTransition(() => onVibeShift())}
            disabled={isVibeShifting}
            className={`relative flex-1 flex items-center justify-center gap-2 h-10 px-2 rounded-lg transition-all group/vibe ${
              isVibeShifting
                ? 'opacity-50'
                : 'hover:bg-purple-500/20 text-slate-400 hover:text-purple-400 hover:scale-[1.02] active:scale-[0.98]'
            }`}
            title="Vibe Shift (Remix Tone)"
          >
             {isVibeShifting ? (
              <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
            ) : (
              <RefreshCw className="w-5 h-5 group-hover/vibe:rotate-180 transition-transform duration-500" />
            )}
            {/* Show label on larger screens for better UX since we have space */}
            <span className="hidden xl:inline text-[10px] font-bold uppercase tracking-wider">Vibe Shift</span>
          </button>

          <div className="w-px h-5 bg-white/10 shrink-0" />

          {/* Auto Layout */}
          <button
            onClick={() => startTransition(() => onAutoLayout())}
            disabled={isAutoLayouting}
            className={`relative flex-1 flex items-center justify-center gap-2 h-10 px-2 rounded-lg transition-all group/layout ${
              isAutoLayouting
                ? 'opacity-50'
                : 'hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 hover:scale-[1.02] active:scale-[0.98]'
            }`}
            title="Auto Layout Text"
          >
             {isAutoLayouting ? (
              <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
            ) : (
              <LayoutGrid className="w-5 h-5 group-hover/layout:rotate-90 transition-transform duration-300" />
            )}
             <span className="hidden xl:inline text-[10px] font-bold uppercase tracking-wider">Auto Layout</span>
          </button>

          <div className="w-px h-5 bg-white/10 shrink-0" />

          {/* Meme IQ */}
          <button
            onClick={() => startTransition(() => onMemeIQ())}
            disabled={isMemeIQing}
            className={`relative flex-1 flex items-center justify-center gap-2 h-10 px-2 rounded-lg transition-all group/iq ${
              isMemeIQing
                ? 'opacity-50'
                : 'hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 hover:scale-[1.02] active:scale-[0.98]'
            }`}
            title="Meme IQ Suggestion"
          >
             {isMemeIQing ? (
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            ) : (
              <Brain className="w-5 h-5 group-hover/iq:scale-110 transition-transform duration-300" />
            )}
             <span className="hidden xl:inline text-[10px] font-bold uppercase tracking-wider">Meme IQ</span>
          </button>

          <div className="w-px h-5 bg-white/10 shrink-0" />

          {/* Style DNA */}
          <button
            onClick={() => startTransition(() => onStyleDna())}
            disabled={isStyleDnaing}
            className={`relative flex-1 flex items-center justify-center gap-2 h-10 px-2 rounded-lg transition-all group/styledna ${
              isStyleDnaing
                ? 'opacity-50'
                : 'hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 hover:scale-[1.02] active:scale-[0.98]'
            }`}
            title="Style DNA Preset"
          >
             {isStyleDnaing ? (
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            ) : (
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 group-hover/styledna:scale-110 transition-transform duration-300"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
            )}
             <span className="hidden xl:inline text-[10px] font-bold uppercase tracking-wider">Style DNA</span>
          </button>

          <div className="w-px h-5 bg-white/10 shrink-0" />

          {/* Emoji Sauce */}
          <button
            onClick={() => startTransition(() => onEmojiSauce())}
            disabled={isEmojiSaucing}
            className={`relative flex-1 flex items-center justify-center gap-2 h-10 px-2 rounded-lg transition-all group/emoji ${
              isEmojiSaucing
                ? 'opacity-50'
                : 'hover:bg-yellow-500/20 text-slate-400 hover:text-yellow-400 hover:scale-[1.02] active:scale-[0.98]'
            }`}
            title="Emoji Sauce (Auto-Stickers)"
          >
             {isEmojiSaucing ? (
              <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
            ) : (
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 group-hover/emoji:scale-110 transition-transform duration-300"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            )}
             <span className="hidden xl:inline text-[10px] font-bold uppercase tracking-wider">Emoji Sauce</span>
          </button>
        </div>
      </div>



      {/* Scrolling Text Inputs area */}
      <div className="px-6 py-2 space-y-4 max-h-[300px] overflow-y-auto pr-4 scrollbar-thin mb-4" role="group" aria-label="Text Inputs">
        {(() => {
          let lastFilledIndex = -1;
          let activeIndex = -1;

          // Safety check for corruption
          const safeTexts = Array.isArray(texts) ? texts : [];

          for (let i = safeTexts.length - 1; i >= 0; i--) {
            if ((safeTexts[i].content || "").trim().length > 0) {
              lastFilledIndex = i;
              break;
            }
          }

          // Find the index of the selected or editing text (for newly created empty texts)
          const activeId = editingId || selectedId;
          if (activeId) {
            activeIndex = safeTexts.findIndex(t => t.id === activeId);
          }

          // Show at least 2 inputs, or up to lastFilledIndex + 2, or up to the active one
          const visibleCount = Math.min(
            Math.max(lastFilledIndex + 2, activeIndex + 1, 2),
            safeTexts.length
          );

          return safeTexts.slice(0, visibleCount).map((textItem, index) => {
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
                className={`relative group ${isNew ? 'animate-text-entry' : ''}`}
              >
                <label htmlFor={`text-input-${textItem.id}`} className="sr-only">
                  {index === 0 ? "Top Text" : index === 1 ? "Bottom Text" : `Text line ${index + 1}`}
                </label>

                {/* Premium Gradient Overlay for Active State */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-transparent rounded-xl pointer-events-none z-0" aria-hidden="true" />
                )}

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
                  className={`w-full relative z-10 bg-[#181818] text-white border rounded-xl px-4 py-3 text-lg transition-all placeholder:text-slate-500 focus:outline-none ${
                    isActive
                      ? 'border-brand shadow-[0_0_15px_rgba(255,153,0,0.1)] placeholder:text-slate-400'
                      : 'border-[#2f3336] hover:border-[#3e4347]'
                  }`}
                  onChange={(e) => handleTextChange(textItem.id, e.target.value)}
                  onFocus={() => {
                    // Always set editingId when focusing an input - this keeps drawer collapsed
                    if (onEditingChange) onEditingChange(textItem.id);
                  }}
                  onBlur={() => {
                    // Commit transient text changes to undo history on blur
                    if (onTextCommit) onTextCommit();
                  }}
                  value={textItem.content}
                />
                <div
                  className={`absolute right-3 top-3.5 pointer-events-none text-xs px-2 py-0.5 rounded uppercase font-bold transition-colors z-20 ${
                    isActive
                      ? 'bg-brand/20 text-brand border border-brand/20'
                      : 'bg-[#0f0f0f] text-slate-500 border border-transparent'
                  }`}
                  aria-hidden="true"
                >
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
      </div>
    </div>

  );
}
