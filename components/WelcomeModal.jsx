import { Sparkles, Layout, Zap, Share2 } from "lucide-react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";

export function WelcomeModal({ isOpen, onClose }) {
  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pt-36 sm:pt-4 backdrop-blur-xl bg-black/40 animate-in fade-in duration-500">
      <div className="glass-panel bg-slate-900/95 rounded-3xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-brand px-8 py-6 text-center">
          <h2 className="text-3xl font-black text-white tracking-tighter drop-shadow-md">
            WELCOME TO MEME CREATOR
          </h2>
        </div>
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* New Features Grid */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
                <Layout className="w-6 h-6 text-brand" />
                <h3 className="text-white font-bold text-sm">Comic Layouts</h3>
                <p className="text-slate-400 text-xs">Tell a story with multi-panel grids. Tap any slot to upload!</p>
             </div>
             <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
                <Zap className="w-6 h-6 text-yellow-400" />
                <h3 className="text-white font-bold text-sm">Animations</h3>
                <p className="text-slate-400 text-xs">Make text wave, glitch, or pulse. Export as high-quality GIF.</p>
             </div>
          </div>

          <section className="space-y-3">
            <h3 className="text-blue-400 font-bold uppercase text-sm tracking-wider flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Export & Sharing
            </h3>
            <ul className="text-slate-300 text-sm space-y-3 list-disc list-outside pl-5 marker:text-slate-600">
              <li><span className="text-white font-medium">Static Images</span> download instantly.</li>
              <li><span className="text-white font-medium">GIFs with Animations</span> are generated client-side. This might take a few seconds but ensures perfect quality!</li>
            </ul>
          </section>

          <div className="bg-brand/10 border border-brand/20 rounded-2xl p-4">
            <h3 className="text-brand font-bold uppercase text-xs tracking-widest mb-2 flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Pro Tip
            </h3>
            <p className="text-brand-light text-xs leading-relaxed">
              Use the <b>Magic AI</b> button in the toolbar to instantly generate hilarious captions for your meme!
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-900 border-2 border-yellow-500 transition-all active:scale-95 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-yellow-400/20"
          >
            Start Creating
          </button>
        </div>
      </div>
    </div>
  );
}
