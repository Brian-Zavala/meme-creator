import ToolPill from "../ToolPill";

const TOOLS = [
  { id: "brightness", label: "Bright",   icon: "☀" },
  { id: "contrast",   label: "Contrast", icon: "◐" },
  { id: "blur",       label: "Blur",     icon: "≋" },
  { id: "hue",        label: "Hue",      icon: "🌡" },
  { id: "grayscale",  label: "Gray",     icon: "◑" },
  { id: "saturate",   label: "Saturate", icon: "💧" },
  { id: "sepia",      label: "Sepia",    icon: "⏱" },
  { id: "invert",     label: "Invert",   icon: "↕" },
  { id: "deepfry",    label: "Deep Fry", icon: "🔥" },
  { id: "crop",       label: "Crop",     icon: "✂" },
];

export default function ImageToolRow({ activeTool, onToolTap }) {
  return (
    <>
      {TOOLS.map(({ id, label, icon }) => (
        <ToolPill
          key={id}
          icon={<span className="text-sm leading-none">{icon}</span>}
          label={label}
          isActive={activeTool === id}
          onClick={() => onToolTap(id)}
        />
      ))}
    </>
  );
}
