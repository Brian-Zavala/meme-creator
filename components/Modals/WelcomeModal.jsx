import { Sparkles, Layout, Zap, Share2, Film } from "lucide-react";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";

export function WelcomeModal({ isOpen, onClose }) {
  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl bg-black/40 animate-in fade-in duration-500">
      <div className="glass-panel bg-slate-900/95 rounded-3xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-brand px-8 py-6 text-center">
          <h2 className="font-black text-white tracking-tighter drop-shadow-md whitespace-nowrap" style={{ fontSize: 'clamp(1.2rem, 5vw, 1.875rem)' }}>
            WELCOME TO MEME CREATOR
          </h2>
        </div>
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

          {/* New Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="gradient-border-card">
               <div className="bg-slate-900 rounded-2xl p-4 flex flex-col items-center text-center h-full w-full relative z-10">
                  <h3 className="text-white font-bold text-sm">Comic Layouts</h3>
                  <p className="text-slate-400 text-xs">Create stories with multi-panel grids. Tap any ghost slot to upload!</p>
               </div>
             </div>
             <div className="gradient-border-card">
               <div className="bg-slate-900 rounded-2xl p-4 flex flex-col items-center text-center h-full w-full relative z-10">
                  <h3 className="text-white font-bold text-sm">Magic AI</h3>
                  <p className="text-slate-400 text-xs">Stuck? Let AI generate hilarious captions matching your image.</p>
               </div>
             </div>
             <div className="gradient-border-card">
               <div className="bg-slate-900 rounded-2xl p-4 flex flex-col items-center text-center h-full w-full relative z-10">
                  <h3 className="text-white font-bold text-sm">Vibe Check</h3>
                  <p className="text-slate-400 text-xs">Deep Fry, Chaos Mode, and Skibidi filters for ultimate dankness.</p>
               </div>
             </div>
             <div className="gradient-border-card">
               <div className="bg-slate-900 rounded-2xl p-4 flex flex-col items-center text-center h-full w-full relative z-10">
                  <h3 className="text-white font-bold text-sm">Animated GIFs</h3>
                  <p className="text-slate-400 text-xs">Create smooth GIFs with animated text & stickers. Export in seconds!</p>
               </div>
             </div>
          </div>

          <section className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col items-center text-center space-y-3">
            <h3 className="text-blue-400 font-bold uppercase text-sm tracking-wider">
              Export & Sharing
            </h3>
            <ul className="text-slate-300 text-sm space-y-3 list-none px-2">
              <li><span className="text-white font-medium">Static Images</span> download instantly.</li>
              <li><span className="text-white font-medium">GIFs with Animations</span> are generated client-side. This might take a few seconds but ensures perfect quality!</li>
            </ul>
          </section>


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
