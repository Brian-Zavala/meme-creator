import { HelpCircle, Coffee } from "lucide-react";

export default function Header({ onOpenInstructions }) {
  return (
    <header className="header flex items-center justify-between px-6 py-4 bg-brand shadow-lg select-none">
      <div className="flex items-center gap-3 cursor-default">
        <div>
          <h1 className="header--title text-2xl font-black tracking-tighter text-white drop-shadow-md">MEME CREATOR</h1>
          <p className="text-[10px] font-bold text-white/80 tracking-[0.2em] uppercase">Free • No Watermark</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <a 
          href="https://www.buymeacoffee.com/memecreatorapp" 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 px-3 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95"
          title="Buy me a coffee"
        >
          <Coffee className="w-4 h-4" />
          <span className="hidden sm:inline">Donate</span>
        </a>

        <button 
          onClick={onOpenInstructions}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90"
          title="How to use"
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
