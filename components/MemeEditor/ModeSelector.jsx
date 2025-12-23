import { ChevronDown } from "lucide-react";

export function ModeSelector({ mode, onModeChange }) {
  return (
    <div className="relative">
      <select 
        value={mode} 
        onChange={onModeChange} 
        className="w-full bg-slate-900/50 hover:bg-white/5 transition-colors border border-slate-700 text-white rounded-xl py-3 px-4 outline-none font-bold text-center appearance-none cursor-pointer"
      >
        <option value="image" className="bg-slate-800 text-white hover:bg-[#7a1a1a]">🖼️ Static Images</option>
        <option value="video" className="bg-slate-800 text-white hover:bg-[#7a1a1a]">🎥 Animated GIFs</option>
      </select>
      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
  );
}
