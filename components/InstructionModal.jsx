import { Move, Type, Layers, Image as ImageIcon, Film } from "lucide-react";

export function InstructionModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl bg-black/40 animate-in fade-in duration-500">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="bg-[oklch(53%_0.187_39)] px-8 py-6 text-center">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
            How to Use
          </h2>
        </div>
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 gap-6">
            <section className="space-y-3">
              <h3 className="text-yellow-500 font-bold uppercase text-sm tracking-wider flex items-center gap-2">
                <Type className="w-4 h-4" /> Text & Stickers
              </h3>
              <ul className="text-slate-300 text-sm space-y-3 list-disc list-outside pl-5 marker:text-slate-600">
                <li><span className="text-white font-medium">Add text</span> using the inputs on the left. A new input appears automatically!</li>
                <li><span className="text-white font-medium">Drag & Drop</span> any text or sticker directly on the canvas.</li>
                <li><span className="text-white font-medium">Long Press / Hold</span> text to select it for fine-tuning and rotation.</li>
                <li><span className="text-white font-medium">Double Tap</span> a sticker to remove it quickly.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-blue-400 font-bold uppercase text-sm tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4" /> Tools & Modes
              </h3>
              <ul className="text-slate-300 text-sm space-y-3 list-disc list-outside pl-5 marker:text-slate-600">
                <li><span className="text-white font-medium">Mode Switch:</span> Toggle between <ImageIcon className="inline w-3 h-3" /> Static Images and <Film className="inline w-3 h-3" /> GIFs.</li>
                <li><span className="text-white font-medium">Filters:</span> Adjust contrast, brightness, and more in the toolbar.</li>
                <li><span className="text-white font-medium">Fine-Tune:</span> Once selected, use the sliders to precisely position and rotate text.</li>
              </ul>
            </section>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
              <h3 className="text-blue-400 font-bold uppercase text-xs tracking-widest mb-2 flex items-center gap-2">
                <Move className="w-3 h-3" /> Pro Tip
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Use the <b>Center</b> button in Fine-Tune to quickly center your text on the canvas!
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="w-full bg-slate-100 hover:bg-white transition-all active:scale-95 py-4 rounded-2xl text-slate-900 font-black uppercase tracking-widest text-sm shadow-lg mt-4"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
