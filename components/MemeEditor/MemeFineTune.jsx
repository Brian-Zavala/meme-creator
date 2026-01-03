import { RefreshCcw, RotateCw } from "lucide-react";

export default function MemeFineTune({ selectedText, onFineTune, onFineTuneCommit, onCenterText }) {
  if (!selectedText) return null;

  // Helper for range slider background
  const getSliderStyle = (value, min, max) => {
    const val = ((value - min) / (max - min)) * 100;
    const color = 'var(--color-brand)'; // McDonald's Red/Orange
    const track = 'rgb(30 41 59)'; // slate-800
    return {
      background: `linear-gradient(to right, ${color} 0%, ${color} ${val}%, ${track} ${val}%, ${track} 100%)`
    };
  };

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
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-bold text-slate-300 transition-all active:scale-95"
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
                    onChange={(e) => {
                        if (navigator.vibrate) navigator.vibrate(5);
                        onFineTune('x', e.target.value);
                    }}
                    onMouseUp={onFineTuneCommit}
                    onTouchEnd={onFineTuneCommit}
                    className="range-slider flex-1 h-1.5 rounded-full cursor-pointer"
                    style={getSliderStyle(selectedText.x, 0, 100)}
                />
            </div>

            {/* Position Y */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-4 text-center">Y</span>
                <input 
                    type="range" 
                    min="0" max="100" step="0.5"
                    value={selectedText.y}
                    onChange={(e) => {
                        if (navigator.vibrate) navigator.vibrate(5);
                        onFineTune('y', e.target.value);
                    }}
                    onMouseUp={onFineTuneCommit}
                    onTouchEnd={onFineTuneCommit}
                    className="range-slider flex-1 h-1.5 rounded-full cursor-pointer"
                    style={getSliderStyle(selectedText.y, 0, 100)}
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
                onChange={(e) => {
                    if (navigator.vibrate) navigator.vibrate(5);
                    onFineTune('rotation', e.target.value);
                }}
                onMouseUp={onFineTuneCommit}
                onTouchEnd={onFineTuneCommit}
                className="range-slider flex-1 h-1.5 rounded-full cursor-pointer"
                style={getSliderStyle(selectedText.rotation || 0, 0, 360)}
            />
        </div>
    </div>
  );
}