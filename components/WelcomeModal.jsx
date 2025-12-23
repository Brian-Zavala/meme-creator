import { Sparkles } from "lucide-react";

export function WelcomeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl bg-black/40 animate-in fade-in duration-500">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="bg-[oklch(53%_0.187_39)] px-8 py-6 text-center">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Meme Creator</h2>
          <p className="text-white/70 text-xs font-bold tracking-widest uppercase mt-1">Creation Guide</p>
        </div>
        <div className="p-8 space-y-6">
          <section className="space-y-3">
            <h3 className="text-yellow-500 font-bold uppercase text-sm tracking-wider">Sharing GIFs</h3>
            <ul className="text-slate-300 text-sm space-y-3 list-disc list-outside pl-5 marker:text-slate-600">
              <li><span className="text-white font-medium">Unedited GIFs</span> can be shared directly to your favorite apps.</li>
              <li>If you add <span className="text-white font-medium">Text or Stickers</span>, we will automatically generate and download a high-quality file for you to share manually.</li>
              <li>This ensures your captions and animations are perfectly preserved for your friends!</li>
            </ul>
          </section>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
            <h3 className="text-blue-400 font-bold uppercase text-xs tracking-widest mb-2 flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Pro Tip
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Use the <b>Magic AI</b> button to instantly generate hilarious captions based on your selected template!
            </p>
          </div>

          <button 
            onClick={onClose} 
            className="w-full bg-slate-100 hover:bg-white transition-all active:scale-95 py-4 rounded-2xl text-slate-900 font-black uppercase tracking-widest text-sm shadow-lg"
          >
            Start Creating
          </button>
        </div>
      </div>
    </div>
  );
}
