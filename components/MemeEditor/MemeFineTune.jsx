import { RefreshCcw, RotateCw } from "lucide-react";
import OptimizedSlider from "../ui/OptimizedSlider";

export default function MemeFineTune({ selectedElement, onFineTune, onFineTuneCommit, onCenterText }) {
  if (!selectedElement) return null;

  return (
    <div
        className="w-full bg-slate-900 border-t border-slate-800 p-4 animate-in slide-in-from-bottom-5 duration-300 flex flex-col gap-3 rounded-b-2xl relative z-30"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
    >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fine Tune</span>

            {/* Size Adjuster */}
            <div className="flex items-center gap-3 px-4 flex-1 justify-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Size</span>
                <OptimizedSlider
                    min="0.1" max="5" step="0.1"
                    value={selectedElement.scale ?? 1}
                    onChange={(e) => onFineTune('scale', e.target.value)}
                    onCommit={onFineTuneCommit}
                    trackColor="rgb(30 41 59)"
                    className="range-slider w-32 h-1.5 rounded-full cursor-pointer"
                />
                <span className="text-[9px] font-mono text-slate-400 w-6 text-right">
                    {Math.round((selectedElement.scale ?? 1) * 100)}%
                </span>
            </div>

            <button
                onClick={onCenterText}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-bold text-slate-300 transition-all active:scale-95"
            >
                <RefreshCcw className="w-3 h-3" /> Center
            </button>
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
                        <span className="text-[9px] font-bold text-red-200 uppercase tracking-wider bg-red-900/80 px-2 py-0.5 rounded shadow-sm backdrop-blur-sm">
                            Locked by Animation
                        </span>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
