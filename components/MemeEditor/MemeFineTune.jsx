import { useState, useEffect, useRef } from "react";
import { RefreshCcw, RotateCw, ChevronDown, Check } from "lucide-react";
import OptimizedSlider from "../ui/OptimizedSlider";

export default function MemeFineTune({ selectedElement, onFineTune, onFineTuneCommit, onQuickPosition }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const positions = [
    { label: "Top Left", value: "top-left" },
    { label: "Top Center", value: "top-center" },
    { label: "Top Right", value: "top-right" },
    { label: "Left Center", value: "center-left" },
    { label: "Center", value: "center" },
    { label: "Right Center", value: "center-right" },
    { label: "Bottom Left", value: "bottom-left" },
    { label: "Bottom Center", value: "bottom-center" },
    { label: "Bottom Right", value: "bottom-right" },
  ];

  if (!selectedElement) return null;

  return (
    <div
        className="w-full card-bg border-t border-[#2f3336] p-4 animate-in slide-in-from-bottom-5 duration-300 flex flex-col gap-3 rounded-b-2xl relative z-30"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
    >
        <div className="flex flex-wrap items-center justify-between pb-2 border-b border-[#2f3336]/50 gap-y-3">
            <span className="text-[clamp(10px,2.5vw,12px)] font-bold uppercase tracking-wider text-slate-500 order-1">Fine Tune</span>

            {/* Size Adjuster */}
            <div className="flex items-center gap-3 px-0 w-full justify-center order-3">
                <span className="text-[clamp(10px,2.5vw,12px)] font-bold text-slate-500 uppercase tracking-wider">Size</span>
                <OptimizedSlider
                    min="0.1" max="5" step="0.1"
                    value={selectedElement.scale ?? 1}
                    onChange={(e) => onFineTune('scale', e.target.value)}
                    onCommit={onFineTuneCommit}
                    trackColor="rgb(30 41 59)"
                    className="range-slider w-full h-1.5 rounded-full cursor-pointer"
                />
                <span className="text-[clamp(9px,2vw,11px)] font-mono text-slate-400 w-10 text-right">
                    {Math.round((selectedElement.scale ?? 1) * 100)}%
                </span>
            </div>

            {/* Custom Position Dropdown */}
            <div className="relative group/pos order-2 mr-2 shrink-0" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1.5 bg-[#181818] hover:bg-[#222222] border border-[#2f3336] hover:border-[#3e4347] rounded-lg px-2.5 py-1.5 justify-between transition-all active:scale-95 group/btn"
                >
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                         Position
                    </span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand' : 'group-hover/btn:text-brand'}`} />
                </button>

                {isOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-[#181818]/95 backdrop-blur-xl border border-[#2f3336] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 origin-bottom-right z-50 flex flex-col p-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                        <div className="px-3 py-2 text-[clamp(9px,2vw,11px)] font-black uppercase tracking-widest text-slate-500 border-b border-white/5 mb-1 bg-slate-900/50">
                            Snap To
                        </div>
                        {positions.map((pos) => (
                            <button
                                key={pos.value}
                                onClick={() => {
                                    onQuickPosition(pos.value);
                                    setIsOpen(false);
                                }}
                                className="flex items-center items-start gap-3 px-3 py-2 text-left rounded-lg transition-all hover:bg-brand/20 hover:text-brand-light group/item relative overflow-hidden"
                            >
                                <div className="grid grid-cols-3 gap-0.5 w-3 h-3 opacity-50 group-hover/item:opacity-100 transition-opacity">
                                    {/* Mini Grid Icon Generation based on position */}
                                    {[...Array(9)].map((_, i) => {
                                        const isActive =
                                            (pos.value === 'top-left' && i === 0) ||
                                            (pos.value === 'top-center' && i === 1) ||
                                            (pos.value === 'top-right' && i === 2) ||
                                            (pos.value === 'center-left' && i === 3) ||
                                            (pos.value === 'center' && i === 4) ||
                                            (pos.value === 'center-right' && i === 5) ||
                                            (pos.value === 'bottom-left' && i === 6) ||
                                            (pos.value === 'bottom-center' && i === 7) ||
                                            (pos.value === 'bottom-right' && i === 8);
                                        return (
                                            <div key={i} className={`w-0.5 h-0.5 rounded-full ${isActive ? 'bg-brand' : 'bg-slate-600'}`} />
                                        )
                                    })}
                                </div>
                                <span className="text-[clamp(10px,2.5vw,12px)] font-bold text-slate-300 uppercase tracking-wider group-hover/item:text-brand group-hover/item:translate-x-1 transition-all">
                                    {pos.label}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {/* Position X */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-4 text-center">X</span>
                <OptimizedSlider
                    min="0" max="100" step="0.5"
                    value={selectedElement.x}
                    onChange={(e) => onFineTune('x', e.target.value)}
                    onCommit={onFineTuneCommit}
                    trackColor="rgb(30 41 59)"
                    className="range-slider flex-1 h-1.5 rounded-full cursor-pointer"
                />
            </div>

            {/* Position Y */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-4 text-center">Y</span>
                <OptimizedSlider
                    min="0" max="100" step="0.5"
                    value={selectedElement.y}
                    onChange={(e) => onFineTune('y', e.target.value)}
                    onCommit={onFineTuneCommit}
                    trackColor="rgb(30 41 59)"
                    className="range-slider flex-1 h-1.5 rounded-full cursor-pointer"
                />
            </div>
        </div>

        {/* Rotation */}
        <div className={`flex items-center gap-3 pt-1 transition-all duration-300 rounded-lg p-1 ${
            selectedElement.animation && selectedElement.animation !== 'none'
                ? 'bg-red-900/20 border border-red-500/30'
                : ''
        }`}>
            <RotateCw className={`w-3.5 h-3.5 transition-colors ${
                selectedElement.animation && selectedElement.animation !== 'none' ? 'text-red-400' : 'text-slate-400'
            }`} />

            <div className="relative flex-1 h-1.5">
                <OptimizedSlider
                    min="0" max="360" step="1"
                    disabled={selectedElement.animation && selectedElement.animation !== 'none'}
                    value={selectedElement.rotation || 0}
                    onChange={(e) => onFineTune('rotation', e.target.value)}
                    onCommit={onFineTuneCommit}
                    trackColor="rgb(30 41 59)"
                    className={`range-slider w-full h-full rounded-full absolute inset-0 ${
                        selectedElement.animation && selectedElement.animation !== 'none'
                            ? 'cursor-not-allowed opacity-50 grayscale'
                            : 'cursor-pointer'
                    }`}
                />

                {selectedElement.animation && selectedElement.animation !== 'none' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[clamp(9px,2vw,11px)] font-bold text-red-200 uppercase tracking-wider bg-red-900/80 px-2 py-0.5 rounded shadow-sm backdrop-blur-sm">
                            Locked by Animation
                        </span>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
