import { ImagePlus, Download, Share2 } from "lucide-react";

export function MemeActions({ onFileUpload, onDownload, onShare }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label
        className="btn-secondary py-3 px-4 cursor-pointer flex items-center justify-center gap-2 col-span-2 touch-target focus-within:ring-2 focus-within:ring-brand focus-within:border-transparent outline-none"
        role="button"
        tabIndex="0"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.currentTarget.querySelector('input').click();
          }
        }}
      >
        <ImagePlus className="w-4 h-4" /> <span>Upload Image / GIF</span>
        <input id="main-file-upload" name="file-upload" type="file" className="hidden" accept="image/*,video/*" onChange={onFileUpload} tabIndex="-1" />
      </label>
      <button
        onClick={onDownload}
        className="bg-slate-100 hover:bg-white text-slate-900 font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 touch-target"
      >
        <Download className="w-5 h-5" /> Download
      </button>
      <button
        onClick={onShare}
        className="btn-secondary py-3 px-6 font-bold shadow-lg flex items-center justify-center gap-2 touch-target"
      >
        <Share2 className="w-5 h-5" /> Share
      </button>
    </div>
  );
}
