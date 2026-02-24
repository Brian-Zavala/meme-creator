// components/Modals/CaptionPicker.jsx
import { useState, useEffect } from 'react';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

/**
 * CaptionPicker — presents up to 3 caption suggestion pairs from asset metadata.
 *
 * Desktop: centered modal with glassmorphism.
 * Mobile: bottom sheet sliding up from bottom.
 *
 * No emojis. Styles match existing modal patterns.
 *
 * @param {object}   props
 * @param {boolean}  props.isOpen
 * @param {Array<{texts:string[]}>} props.suggestions  1–3 options (each texts[] maps to panels)
 * @param {string}   props.metaRaw   Raw description shown as subtitle (truncated)
 * @param {function} props.onApply   Called with selected { texts }
 * @param {function} props.onDismiss Called when dismissed with no selection
 */
export function CaptionPicker({ isOpen, suggestions, metaRaw, onApply, onDismiss }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  useLockBodyScroll(isOpen);

  // Reset selection whenever the picker opens with new suggestions.
  useEffect(() => {
    if (isOpen) setSelectedIdx(0);
  }, [isOpen]);

  if (!isOpen || !Array.isArray(suggestions) || suggestions.length === 0) return null;

  const selected = suggestions[selectedIdx];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-xl animate-in fade-in duration-300"
      onClick={onDismiss}
    >
      <div
        className="w-full sm:max-w-md rounded-t-[18px] sm:rounded-3xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-300"
        style={{
          background: 'rgba(22, 22, 22, 0.92)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow:
            '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.07)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-white font-black text-lg tracking-tight">
            Caption Suggestions
          </h2>
          {metaRaw && (
            <p className="text-slate-400 text-xs mt-1 truncate">
              From: {metaRaw}
            </p>
          )}
        </div>

        {/* Options */}
        <div className="px-6 flex flex-col gap-3 pb-4">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={[
                'w-full text-left px-4 py-3 rounded-2xl border transition-all active:scale-[0.98]',
                selectedIdx === i
                  ? 'border-brand bg-brand/10'
                  : 'bg-[#181818] border-[#2f3336] hover:border-[#3e4347]',
              ].join(' ')}
            >
              <p className="text-white text-sm font-semibold leading-snug">{s.texts[0]}</p>
              {s.texts.slice(1).map((line, j) => (
                <p key={j} className="text-slate-400 text-xs mt-0.5 leading-snug">{line}</p>
              ))}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 bg-[#181818]/50 hover:bg-[#222222] border-2 border-[#2f3336] hover:border-brand/40 rounded-2xl py-3 text-slate-300 font-semibold text-sm transition-all active:scale-[0.98]"
          >
            Dismiss
          </button>
          <button
            onClick={() => onApply(selected)}
            className="flex-1 bg-brand hover:bg-brand/85 text-white border-2 border-brand-dark rounded-2xl py-3 font-black uppercase tracking-widest text-sm shadow-lg shadow-brand/20 transition-all active:scale-95"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
