const ACTIONS = [
  { id: "chaos",       label: "Chaos",         icon: "🎲" },
  { id: "captionRemix",label: "Caption Remix",  icon: "✨" },
  { id: "styleShuffle",label: "Style Shuffle",  icon: "🎨" },
  { id: "removeAll",   label: "Remove All",     icon: "🗑",  danger: true },
  { id: "removeEffects",label: "Remove Effects",icon: "✨",  teal: true },
];

export default function QuickToolRow({
  onChaos,
  onCaptionRemix,
  onStyleShuffle,
  onRemoveAll,
  onRemoveEffects,
}) {
  const handlers = {
    chaos:         onChaos,
    captionRemix:  onCaptionRemix,
    styleShuffle:  onStyleShuffle,
    removeAll:     onRemoveAll,
    removeEffects: onRemoveEffects,
  };

  return (
    <>
      {ACTIONS.map(({ id, label, icon, danger, teal }) => (
        <button
          key={id}
          type="button"
          onClick={handlers[id]}
          className="tool-pill"
          style={
            danger
              ? { color: "#f87171", borderColor: "#3f1a1a", background: "rgba(239,68,68,0.08)" }
              : teal
              ? { color: "#2dd4bf", borderColor: "#0f3330", background: "rgba(45,212,191,0.08)" }
              : undefined
          }
        >
          <span className="text-sm leading-none">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </>
  );
}
