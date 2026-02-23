import {
  Shuffle,
  Chat,
  PaintBrush,
  SlidersHorizontal,
  Thermometer,
  Fire,
  Sticker,
  Radioactive,
  MonitorPlay,
  Skull,
  Confetti,
  Timer,
  Trash,
  Sparkle,
} from "@phosphor-icons/react";

const ACTIONS = [
  { id: "removeAll",     label: "Remove All",     Icon: Trash,            danger: true },
  { id: "removeEffects", label: "Clear FX",       Icon: Sparkle,          teal: true },
  { id: "chaos",         label: "Chaos",          Icon: Shuffle },
  { id: "captionRemix",  label: "Caption",        Icon: Chat },
  { id: "styleShuffle",  label: "Style",          Icon: PaintBrush },
  { id: "filterFrenzy",  label: "Filter",         Icon: SlidersHorizontal },
  { id: "vibeCheck",     label: "Vibe",           Icon: Thermometer },
  { id: "deepFry",       label: "Deep Fry",       Icon: Fire },
  { id: "stickerfy",     label: "Stickerfy",      Icon: Sticker },
  { id: "nuked",         label: "Nuked",          Icon: Radioactive },
  { id: "glitch",        label: "Glitch",         Icon: MonitorPlay },
  { id: "cursed",        label: "Cursed",         Icon: Skull },
  { id: "confetti",      label: "Confetti",       Icon: Confetti },
  { id: "timeWarp",      label: "Time Warp",      Icon: Timer },
];

export default function QuickToolRow({
  onChaos,
  onCaptionRemix,
  onStyleShuffle,
  onFilterFrenzy,
  onVibeCheck,
  onExtremeDeepFry,
  onStickerfy,
  onNuked,
  onGlitch,
  onCursed,
  onConfettiBlast,
  onTimeWarp,
  onRemoveAll,
  onRemoveEffects,
}) {
  const handlers = {
    chaos:         onChaos,
    captionRemix:  onCaptionRemix,
    styleShuffle:  onStyleShuffle,
    filterFrenzy:  onFilterFrenzy,
    vibeCheck:     onVibeCheck,
    deepFry:       onExtremeDeepFry,
    stickerfy:     onStickerfy,
    nuked:         onNuked,
    glitch:        onGlitch,
    cursed:        onCursed,
    confetti:      onConfettiBlast,
    timeWarp:      onTimeWarp,
    removeAll:     onRemoveAll,
    removeEffects: onRemoveEffects,
  };

  return (
    <>
      {ACTIONS.map(({ id, label, Icon, danger, teal }) => (
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
          <Icon size={16} />
          <span>{label}</span>
        </button>
      ))}
    </>
  );
}
