import { Wand2, Loader2, RefreshCw, LayoutGrid, Brain } from "lucide-react";

export default function AiToolRow({ onMagicCaption, isMagicGenerating, onVibeShift, isVibeShifting, onAutoLayout, isAutoLayouting, onMemeIQ, isMemeIQing }) {
  return (
    <>
      {/* Magic AI */}
      <button
        type="button"
        onClick={onMagicCaption}
        disabled={isMagicGenerating}
        className="tool-pill ai-magic-pill"
      >
        {isMagicGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wand2 className="w-4 h-4" />
        )}
        <span>{isMagicGenerating ? "Generating..." : "Magic AI"}</span>
      </button>

      {/* Vibe Shift */}
      <button
        type="button"
        onClick={onVibeShift}
        disabled={isVibeShifting}
        className="tool-pill ai-magic-pill"
      >
        {isVibeShifting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        <span>{isVibeShifting ? "Shifting..." : "Vibe Shift"}</span>
      </button>

      {/* Auto Layout */}
      <button
        type="button"
        onClick={onAutoLayout}
        disabled={isAutoLayouting}
        className="tool-pill ai-magic-pill"
      >
        {isAutoLayouting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LayoutGrid className="w-4 h-4" />
        )}
        <span>{isAutoLayouting ? "Analyzing..." : "Auto Layout"}</span>
      </button>

      {/* Meme IQ */}
      <button
        type="button"
        onClick={onMemeIQ}
        disabled={isMemeIQing}
        className="tool-pill ai-magic-pill"
      >
        {isMemeIQing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Brain className="w-4 h-4" />
        )}
        <span>{isMemeIQing ? "Thinking..." : "Meme IQ"}</span>
      </button>
    </>
  );
}
