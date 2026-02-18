import { Wand2, Loader2 } from "lucide-react";

export default function AiToolRow({ onMagicCaption, isMagicGenerating }) {
  return (
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
  );
}
