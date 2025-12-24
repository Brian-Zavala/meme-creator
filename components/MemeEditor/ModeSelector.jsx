import { ChevronDown } from "lucide-react";

export function ModeSelector({ mode, onModeChange }) {
  return (
    <div className="relative w-full rounded-xl bg-slate-900/50 hover:bg-white/5 transition-colors border border-slate-700">
      <select 
        value={mode} 
        onChange={onModeChange} 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 text-center"
      >
        <option value="image" className="bg-slate-800 text-white text-center">Static Images</option>
        <option value="video" className="bg-slate-800 text-white text-center">Animated GIFs</option>
      </select>
      
      <div className="flex items-center justify-center py-3 px-4 h-full relative z-10 pointer-events-none">
        <span 
          key={mode} 
          className="font-bold text-center text-lg animate-text-shimmer"
        >
          {mode === "image" ? "Static Images" : "Animated GIFs"}
        </span>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
}
