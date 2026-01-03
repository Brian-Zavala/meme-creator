import { Undo2, Redo2, HelpCircle, ImagePlus, Eraser, Download, Share2 } from "lucide-react";
import toast from "react-hot-toast";

export function MemeActions({ undo, redo, canUndo, canRedo, onFileUpload, onReset, onDownload, onShare }) {
  return (
    <>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="bg-slate-800 disabled:opacity-50 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
        >
          <Undo2 className="w-4 h-4" /> Undo
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="bg-slate-800 disabled:opacity-50 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
        >
          <Redo2 className="w-4 h-4" /> Redo
        </button>
        <button
          onClick={() => toast("Tip: Ctrl+Z/Y work too!", { icon: "💡" })}
          className="w-12 flex items-center justify-center bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-400 transition-all active:scale-95"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-700 col-span-2">
          <ImagePlus className="w-4 h-4" /> <span>Upload Image</span>
          <input type="file" className="hidden" accept="image/*,video/*" onChange={onFileUpload} />
        </label>
        <button
          onClick={onReset}
          className="bg-slate-800 hover:bg-red-900/30 hover:text-red-400 text-slate-400 font-semibold py-3 px-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-700 col-span-2"
        >
          <Eraser className="w-4 h-4" /> <span>Remove Text</span>
        </button>
        <button
          onClick={onDownload}
          className="bg-slate-100 hover:bg-white text-slate-900 font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Download className="w-5 h-5" /> Download
        </button>
        <button
          onClick={onShare}
          className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95"
        >
          <Share2 className="w-5 h-5" /> Share
        </button>
      </div>
    </>
  );
}
