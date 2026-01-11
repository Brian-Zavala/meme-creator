import { Move, Type, Layers, Image as ImageIcon, Film, Layout, Hand } from "lucide-react";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";

export function InstructionModal({ isOpen, onClose }) {
  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl bg-black/40 animate-in fade-in duration-500"
      role="dialog"
      aria-modal="true"
      aria-labelledby="instruction-modal-title"
    >
      <div className="glass-panel bg-slate-900/95 rounded-3xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-brand px-8 py-6 text-center">
          <h2 id="instruction-modal-title" className="text-2xl sm:text-3xl font-black text-white tracking-tighter drop-shadow-md">
            HOW TO USE
          </h2>
        </div>
        <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 gap-6">

            <div className="gradient-border-card">
              <div className="bg-slate-900 rounded-2xl relative z-10 h-full w-full overflow-hidden">
                <section className="bg-brand/10 p-4 space-y-3 flex flex-col items-center text-center h-full">
                  <h3 className="text-brand font-bold uppercase text-sm tracking-wider">
                    Layouts & Images
                  </h3>
                  <ul className="text-slate-300 text-sm space-y-3 list-none px-2">
                    <li><span className="text-white font-medium">Multi-Panel:</span> Choose a grid layout from the toolbar.</li>
                    <li><span className="text-white font-medium">Ghost Slots:</span> Tap any empty "Ghost" slot to upload or search for an image.</li>
                    <li><span className="text-white font-medium">Drag to Pan:</span> Touch and drag an image within its frame to adjust position/crop.</li>
                  </ul>
                </section>
              </div>
            </div>

            <div className="gradient-border-card">
              <div className="bg-slate-900 rounded-2xl relative z-10 h-full w-full overflow-hidden">
                <section className="bg-yellow-500/10 p-4 space-y-3 flex flex-col items-center text-center h-full">
                  <h3 className="text-yellow-500 font-bold uppercase text-sm tracking-wider">
                    Text & Stickers
                  </h3>
                  <ul className="text-slate-300 text-sm space-y-3 list-none px-2">
                    <li><span className="text-white font-medium">Long Press:</span> Hold anywhere on the canvas to add text instantly.</li>
                    <li><span className="text-white font-medium">Double Tap:</span> Quickly tap any sticker twice to remove it.</li>
                    <li><span className="text-white font-medium">Smart Delete:</span> Remove buttons now automatically jump to the side to stay visible!</li>
                  </ul>
                </section>
              </div>
            </div>

            <div className="gradient-border-card">
              <div className="bg-slate-900 rounded-2xl relative z-10 h-full w-full overflow-hidden">
                <section className="bg-purple-500/10 p-4 space-y-3 flex flex-col items-center text-center h-full">
                  <h3 className="text-purple-400 font-bold uppercase text-sm tracking-wider">
                     Magic & Vibes
                  </h3>
                  <ul className="text-slate-300 text-sm space-y-3 list-none px-2">
                    <li><span className="text-white font-medium">Magic AI:</span> Tap the sparkles to let AI write the caption for you.</li>
                    <li><span className="text-white font-medium">Vibe Check:</span> Spam the button for random filters, Deep Fry, or Chaos Mode.</li>
                  </ul>
                </section>
              </div>
            </div>

            <div className="bg-lime-500/10 border border-lime-500/20 rounded-2xl p-4 flex flex-col items-center text-center">
              <h3 className="text-lime-400 font-bold uppercase text-xs tracking-widest mb-2">
                 Pro Tip
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Ready to share? GIFs support Copy & Paste everywhere! No downloading required.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-brand hover:bg-brand/85 text-white border-2 border-brand-dark transition-all active:scale-95 py-3 sm:py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg mt-4 shadow-brand/20"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
