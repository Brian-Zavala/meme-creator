import { useState } from "react";
import { createPortal } from "react-dom";
import { Wand2, Loader2, RefreshCw, LayoutGrid, Brain, CircleHelp, X, Sparkles, Zap, Grid, Lightbulb } from "lucide-react";

const AI_TOOL_INFO = [
  {
    id: "autolayout",
    label: "Auto Layout",
    icon: LayoutGrid,
    color: "text-green-400",
    borderColor: "border-green-500/30",
    bgColor: "bg-green-500/10",
    activeBg: "active:bg-green-500/20",
    description: "Automatically arranges text and images for the best composition.",
    useCase: "Great for fixing messy layouts or text covering faces."
  },
  {
    id: "magic",
    label: "Magic AI",
    icon: Sparkles,
    color: "text-purple-400",
    borderColor: "border-purple-500/30",
    bgColor: "bg-purple-500/10",
    activeBg: "active:bg-purple-500/20",
    description: "Generates a caption for your image based on visual analysis.",
    useCase: "Perfect when you have a great image but no idea what to write."
  },
  {
    id: "vibeshift",
    label: "Vibe Shift",
    icon: RefreshCw,
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/10",
    activeBg: "active:bg-blue-500/20",
    description: "Rewrites your caption with a different tone or style.",
    useCase: "Use this to make your text funnier, darker, or more sarcastic."
  },
  {
    id: "memeiq",
    label: "Meme IQ",
    icon: Brain,
    color: "text-pink-400",
    borderColor: "border-pink-500/30",
    bgColor: "bg-pink-500/10",
    activeBg: "active:bg-pink-500/20",
    description: "Analyzes your text to suggest the perfect meme template.",
    useCase: "Best when you have a joke but need the right image format."
  }
];

export default function AiToolRow({ onMagicCaption, isMagicGenerating, onVibeShift, isVibeShifting, onAutoLayout, isAutoLayouting, onMemeIQ, isMemeIQing }) {
  const [showInfo, setShowInfo] = useState(false);

  // Map handlers to IDs
  const getToolState = (id) => {
    switch (id) {
      case 'magic': return { onClick: onMagicCaption, loading: isMagicGenerating, loadingText: "Generating..." };
      case 'vibeshift': return { onClick: onVibeShift, loading: isVibeShifting, loadingText: "Shifting..." };
      case 'autolayout': return { onClick: onAutoLayout, loading: isAutoLayouting, loadingText: "Analyzing..." };
      case 'memeiq': return { onClick: onMemeIQ, loading: isMemeIQing, loadingText: "Thinking..." };
      default: return {};
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 h-full w-max">
        {/* Help Button - Always First */}
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-slate-300 active:scale-95 transition-all active:bg-white/10 active:text-white"
        >
          <CircleHelp className="w-5 h-5" />
        </button>

        {/* Dynamic AI Buttons */}
        {AI_TOOL_INFO.map((tool) => {
          const { onClick, loading, loadingText } = getToolState(tool.id);
          const Icon = tool.icon;

          return (
            <button
              key={tool.id}
              type="button"
              onClick={onClick}
              disabled={loading}
              className={`tool-pill ${tool.color} ${tool.borderColor} ${tool.bgColor} ${tool.activeBg} border`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              <span>{loading ? loadingText : tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* Info Modal Overlay - Portalled to body to escape stacking contexts */}
      {showInfo && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowInfo(false)}>
          <div
            className="w-full max-w-md bg-[#1e1e1e] border border-[#2f3336] rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Header - Brand Color Accent */}
            <div className="flex items-center justify-between p-4 border-b border-[#2f3336] bg-[#181818]">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-lg">AI Tools Guide</h3>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {AI_TOOL_INFO.map((tool) => {
                const Icon = tool.icon;
                return (
                  <div key={tool.id} className="flex gap-4 p-3 rounded-xl bg-[#181818] border border-[#2f3336]">
                    <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${tool.bgColor} ${tool.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className={`font-bold text-base ${tool.color}`}>{tool.label}</h4>
                      <p className="text-sm text-slate-300 leading-snug">{tool.description}</p>
                      <p className="text-xs text-slate-500 italic mt-1">"{tool.useCase}"</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#2f3336] bg-[#181818]">
              <button
                onClick={() => setShowInfo(false)}
                className="w-full py-3 rounded-xl bg-brand text-white font-bold uppercase tracking-wide active:scale-[0.98] transition-all shadow-lg shadow-brand/20"
              >
                Got it
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
