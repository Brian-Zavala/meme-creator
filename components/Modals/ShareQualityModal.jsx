import { Video, Zap, Timer, Award } from "lucide-react";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";

/**
 * Modal to select video quality for sharing/exporting
 * Balances quality vs encoding time
 */
export function ShareQualityModal({ isOpen, onClose, onSelect }) {
    useLockBodyScroll(isOpen);

    if (!isOpen) return null;

    const options = [
        {
            id: 'high',
            title: 'High Quality',
            subtitle: '1080p • Crystal Clear',
            time: '~15-30s',
            icon: Award,
            color: 'text-purple-400',
            bgColor: 'bg-purple-500/20',
            border: 'border-purple-500/30'
        },
        {
            id: 'medium',
            title: 'Balanced',
            subtitle: '720p • Good for Socials',
            time: '~5-10s',
            icon: Video,
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/20',
            border: 'border-blue-500/30',
            recommended: true
        },
        {
            id: 'low',
            title: 'Fast',
            subtitle: '480p • Quick Share',
            time: '~2-5s',
            icon: Zap,
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/20',
            border: 'border-amber-500/30'
        }
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl bg-black/40 animate-in fade-in duration-300">
            <div className="card-bg border border-[#2f3336] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 text-center">
                    <h2 className="text-xl font-black text-white tracking-tight drop-shadow-md flex items-center justify-center gap-2">
                        <Video className="w-6 h-6" />
                        SELECT VIDEO QUALITY
                    </h2>
                    <p className="text-blue-100 text-xs mt-1 font-medium">Higher quality takes longer to encode</p>
                </div>

                <div className="p-6 space-y-3">
                    {options.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => onSelect(opt.id)}
                            className={`w-full group relative bg-[#181818]/50 hover:bg-[#222222] border-2 ${opt.border} hover:border-opacity-100 rounded-2xl p-4 transition-all active:scale-[0.98]`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl ${opt.bgColor} flex items-center justify-center shrink-0`}>
                                    <opt.icon className={`w-6 h-6 ${opt.color}`} />
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-white font-bold text-base truncate">{opt.title}</p>
                                        <div className="flex items-center gap-1 text-xs text-slate-400 bg-black/20 px-2 py-1 rounded-full">
                                            <Timer className="w-3 h-3" />
                                            {opt.time}
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs truncate">{opt.subtitle}</p>
                                </div>
                            </div>
                            {opt.recommended && (
                                <span className="absolute -top-2 right-4 text-[10px] bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm border border-blue-400">
                                    Recommended
                                </span>
                            )}
                        </button>
                    ))}

                    <button
                        onClick={onClose}
                        className="w-full text-slate-500 hover:text-slate-300 text-xs font-medium py-3 transition-colors mt-2"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
