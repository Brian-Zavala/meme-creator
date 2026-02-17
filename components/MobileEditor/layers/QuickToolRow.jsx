import {
  Shuffle,
  MessageSquare,
  Paintbrush,
  SlidersHorizontal,
  Thermometer,
  Flame,
  Sticker,
  Radiation,
  MonitorX,
  Skull,
  PartyPopper,
  Timer,
  Trash2,
  Sparkles,
} from "lucide-react";

const ACTIONS = [
  { id: "chaos",         label: "Chaos",          Icon: Shuffle },
  { id: "captionRemix",  label: "Caption",        Icon: MessageSquare },
  { id: "styleShuffle",  label: "Style",          Icon: Paintbrush },
  { id: "filterFrenzy",  label: "Filter",         Icon: SlidersHorizontal },
  { id: "vibeCheck",     label: "Vibe",           Icon: Thermometer },
  { id: "deepFry",       label: "Deep Fry",       Icon: Flame },
  { id: "stickerfy",     label: "Stickerfy",      Icon: Sticker },
  { id: "nuked",         label: "Nuked",          Icon: Radiation },
  { id: "glitch",        label: "Glitch",         Icon: MonitorX },
  { id: "cursed",        label: "Cursed",         Icon: Skull },
  { id: "confetti",      label: "Confetti",       Icon: PartyPopper },
  { id: "timeWarp",      label: "Time Warp",      Icon: Timer },
  { id: "removeAll",     label: "Remove All",     Icon: Trash2,    danger: true },
  { id: "removeEffects", label: "Clear FX",       Icon: Sparkles,  teal: true },
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
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </button>
      ))}
    </>
  );
}
