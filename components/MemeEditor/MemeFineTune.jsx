import { RefreshCcw, RotateCw } from "lucide-react";

export default function MemeFineTune({ selectedText, onFineTune, onFineTuneCommit, onCenterText }) {
  if (!selectedText) return null;

  return (
    <div 
        className="w-full bg-slate-900 border-t border-slate-800 p-4 animate-in slide-in-from-bottom-5 duration-300 flex flex-col gap-3 rounded-b-2xl relative z-30" 
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
    >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fine Tune</span>
            <button 
                onClick={onCenterText}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-bold text-slate-300 transition-colors"
            >
                <RefreshCcw className="w-3 h-3" /> Center
            </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {/* Position X */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-4 text-center">X</span>
                <input 
                    type="range" 
                    min="0" max="100" step="0.5"
                    value={selectedText.x}
                    onChange={(e) => onFineTune('x', e.target.value)}
                    onMouseUp={onFineTuneCommit}
                    onTouchEnd={onFineTuneCommit}
                    className="flex-1 accent-[oklch(53%_0.187_39)] h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                />
            </div>

            {/* Position Y */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-4 text-center">Y</span>
                <input 
                    type="range" 
                    min="0" max="100" step="0.5"
                    value={selectedText.y}
                    onChange={(e) => onFineTune('y', e.target.value)}
                    onMouseUp={onFineTuneCommit}
                    onTouchEnd={onFineTuneCommit}
                    className="flex-1 accent-[oklch(53%_0.187_39)] h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
                />
            </div>
        </div>

        {/* Rotation */}
        <div className="flex items-center gap-3 pt-1">
            <RotateCw className="w-3.5 h-3.5 text-slate-400" />
            <input 
                type="range" 
                min="0" max="360" step="1"
                value={selectedText.rotation || 0}
                onChange={(e) => onFineTune('rotation', e.target.value)}
                onMouseUp={onFineTuneCommit}
                onTouchEnd={onFineTuneCommit}
                className="flex-1 accent-[oklch(53%_0.187_39)] h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer"
            />
        </div>
    </div>
  );
}