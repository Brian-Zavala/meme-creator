import { useState } from "react";
import { HelpCircle, Coffee, Menu, X } from "lucide-react";

export default function Header({ onOpenInstructions }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="header flex items-center justify-between px-6 py-4 bg-brand shadow-lg select-none relative z-[100]">
      <div className="flex items-center gap-3 cursor-default">
        <div>
          <h1 className="header--title text-2xl font-black tracking-tighter text-white drop-shadow-md">MEME CREATOR</h1>
          <p className="text-[10px] font-bold text-white/80 tracking-[0.2em] uppercase">Free • No Watermark</p>
        </div>
      </div>

      {/* Desktop Actions */}
      <div className="hidden md:flex items-center gap-2">
        <a
          href="https://www.buymeacoffee.com/memecreatorapp"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 px-3 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95"
          title="Buy me a coffee"
        >
          <Coffee className="w-4 h-4" />
          <span>Donate</span>
        </a>

        <button
          onClick={onOpenInstructions}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-90"
          title="How to use"
          aria-label="Open instructions"
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Hamburger Button */}
      <button
        className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors group"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle menu"
      >
        <div className={`transition-transform duration-300 ease-in-out ${isMenuOpen ? 'rotate-90' : 'rotate-0'}`}>
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </div>
      </button>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 glass-panel bg-slate-900/95 border-t border-white/10 p-4 flex flex-col gap-4 shadow-2xl origin-top animate-roll-down md:hidden z-[100]">
          <button
            onClick={() => {
              onOpenInstructions();
              setIsMenuOpen(false);
            }}
            className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white font-bold border-2 border-brand"
          >
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <span>Instructions</span>
          </button>

          <a
            href="https://www.buymeacoffee.com/memecreatorapp"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 w-full p-3 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors text-yellow-400 font-bold border-2 border-brand"
          >
            <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
              <Coffee className="w-5 h-5" />
            </div>
            <span>Buy me a coffee</span>
          </a>
        </div>
      )}
    </header>
  );
}
