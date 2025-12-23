import { Smile, Zap, Heart, Ghost, Flame, Crown } from "lucide-react";

const STICKER_OPTIONS = [
  { id: "cool", emoji: "😎" },
  { id: "skull", emoji: "💀" },
  { id: "fire", emoji: "🔥" },
  { id: "crown", emoji: "👑" },
  { id: "laugh", emoji: "😂" },
  { id: "moai", emoji: "🗿" },
  { id: "heart", emoji: "❤️" },
  { id: "ghost", emoji: "👻" },
  { id: "mind-blown", emoji: "🤯" },
  { id: "eyes", emoji: "👀" },
  { id: "party", emoji: "🎉" },
  { id: "hundred", emoji: "💯" },
  { id: "deal-with-it", emoji: "🕶️" },
  { id: "clown", emoji: "🤡" },
  { id: "cap", emoji: "🧢" },
  { id: "thug-life", emoji: "🔫" },
  { id: "money", emoji: "💰" },
  { id: "stonks", emoji: "📈" },
  { id: "siren", emoji: "🚨" },
  { id: "big-brain", emoji: "🧠" },
  { id: "salt", emoji: "🧂" },
  { id: "trash", emoji: "🗑️" },
  { id: "red-flag", emoji: "🚩" },
  { id: "doge", emoji: "🐕" },
  { id: "b-button", emoji: "🅱️" },
  { id: "thinking", emoji: "🤔" },
  { id: "shushing", emoji: "🤫" },
  { id: "melting", emoji: "🫠" }
];

export default function MemeStickerLibrary({ onAddSticker }) {
  return (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 text-slate-400 mb-4 uppercase text-xs font-bold tracking-wider">
        <Smile className="w-4 h-4" /> Sticker Library
      </div>
      
      <div className="grid grid-cols-4 gap-3">
        {STICKER_OPTIONS.map((sticker) => (
          <button
            key={sticker.id}
            onClick={() => onAddSticker(sticker.emoji)}
            className="h-12 flex items-center justify-center text-2xl bg-slate-800 hover:bg-slate-700 rounded-xl transition-all active:scale-90 border border-slate-700 hover:border-slate-500 cursor-pointer"
          >
            {sticker.emoji}
          </button>
        ))}
      </div>
      
      <p className="text-[10px] text-slate-500 mt-4 text-center italic">
        Click to add. Drag to move. Long-press/Double-click to remove.
      </p>
    </div>
  );
}
