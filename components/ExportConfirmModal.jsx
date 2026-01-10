import { Film, Image as ImageIcon, Sparkles } from "lucide-react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";

/**
 * Modal to confirm export format when static image has animated content
 * Lets user choose between GIF (keep animations) or PNG (static export)
 */
export function ExportConfirmModal({ isOpen, onClose, onExportGif, onExportStatic, isStickerOnly }) {
    useLockBodyScroll(isOpen);

    if (!isOpen) return null;

    const handleGifExport = () => {
        onClose();
        onExportGif();
    };

    const handleStaticExport = () => {
        onClose();
        onExportStatic();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl bg-black/40 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-brand px-6 py-5 text-center">
                    <h2 className="text-xl font-black text-white tracking-tight drop-shadow-md flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        {isStickerOnly ? "ANIMATED STICKERS DETECTED" : "ANIMATED CONTENT DETECTED"}
                    </h2>
                </div>

                <div className="p-6 space-y-5">
                    <p className="text-slate-300 text-sm text-center leading-relaxed">
                        {isStickerOnly
                            ? "Some stickers are animated GIFs."
                            : <span>Your meme has <span className="text-white font-semibold">animated stickers or text</span>.</span>
                        }
                        <br />How would you like to export?
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        {/* GIF Export Option */}
                        <button
                            onClick={handleGifExport}
                            className="group relative bg-gradient-to-br from-brand/20 to-amber-500/20 hover:from-brand/30 hover:to-amber-500/30 border-2 border-brand/50 hover:border-brand rounded-2xl p-4 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center">
                                    <Film className="w-6 h-6 text-brand" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-white font-bold text-sm sm:text-base whitespace-nowrap">Keep Animations</p>
                                    <p className="text-slate-400 text-xs">Export as GIF file</p>
                                </div>
                            </div>
                            <span className="absolute top-1 right-1 sm:top-2 sm:right-2 text-[length:clamp(0.45rem,1.5vw,0.625rem)] bg-brand/20 text-brand font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full uppercase tracking-wider shadow-sm">
                                Recommended
                            </span>
                        </button>

                        {/* Static Export Option */}
                        <button
                            onClick={handleStaticExport}
                            className="group relative bg-slate-800/50 hover:bg-slate-800 border-2 border-slate-700 hover:border-slate-600 rounded-2xl p-4 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-slate-400" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-white font-bold text-base">Static Image</p>
                                    <p className="text-slate-400 text-xs">Export as PNG (no animations)</p>
                                </div>
                            </div>
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full text-slate-500 hover:text-slate-300 text-xs font-medium py-2 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
