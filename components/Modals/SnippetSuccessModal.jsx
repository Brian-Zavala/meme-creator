import { Crop, Download, RotateCcw, Check } from "lucide-react";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";

/**
 * Modal to confirm successful crop/snippet with preview and export options
 */
export function SnippetSuccessModal({ isOpen, onClose, onRetry, onExport, croppedImageUrl }) {
    useLockBodyScroll(isOpen);

    if (!isOpen) return null;

    const handleRetry = () => {
        onClose();
        onRetry();
    };

    const handleExport = () => {
        onClose();
        onExport();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl bg-black/40 animate-in fade-in duration-300">
            <div className="card-bg border border-[#2f3336] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-5 text-center">
                    <h2 className="text-xl font-black text-white tracking-tight drop-shadow-md flex items-center justify-center gap-2">
                        <Check className="w-5 h-5" />
                        SNIPPET SUCCESSFUL
                    </h2>
                </div>

                <div className="p-6 space-y-5">
                    {/* Preview of cropped image */}
                    {croppedImageUrl && (
                        <div className="relative rounded-xl overflow-hidden border border-[#2f3336] bg-[#181818]">
                            <img
                                src={croppedImageUrl}
                                alt="Cropped snippet preview"
                                className="w-full h-auto max-h-48 object-contain"
                            />
                        </div>
                    )}

                    <p className="text-slate-300 text-xs sm:text-sm text-center leading-relaxed">
                        Your snippet has been captured. What would you like to do?
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        {/* Export Option */}
                        <button
                            onClick={handleExport}
                            className="group relative bg-gradient-to-br from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border-2 border-green-500/50 hover:border-green-500 rounded-2xl p-4 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                    <Download className="w-6 h-6 text-green-400" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-white font-bold text-sm sm:text-base whitespace-nowrap">Export Snippet</p>
                                    <p className="text-slate-400 text-xs">Download as PNG image</p>
                                </div>
                            </div>
                            <span className="absolute top-1 right-1 sm:top-2 sm:right-2 text-[length:clamp(0.45rem,1.5vw,0.625rem)] bg-green-500/20 text-green-400 font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full uppercase tracking-wider shadow-sm">
                                Recommended
                            </span>
                        </button>

                        {/* Retry Option */}
                        <button
                            onClick={handleRetry}
                            className="group relative bg-[#181818]/50 hover:bg-[#222222] border-2 border-[#2f3336] hover:border-[#3e4347] rounded-2xl p-4 transition-all active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center">
                                    <RotateCcw className="w-6 h-6 text-slate-400" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-white font-bold text-sm sm:text-base">Retry</p>
                                    <p className="text-slate-400 text-xs">Select a different area</p>
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
