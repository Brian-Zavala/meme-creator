import ToolPill from "../ToolPill";

const TOOLS = [
  { id: "font",    label: "Font",    icon: "Aa" },
  { id: "size",    label: "Size",    icon: "↕" },
  { id: "color",   label: "Color",   icon: "🎨" },
  { id: "width",   label: "Width",   icon: "↔" },
  { id: "spacing", label: "Spacing", icon: "Aa·" },
  { id: "anim",    label: "Anim",    icon: "✦" },
  { id: "bg",      label: "BG",      icon: "▪" },
  { id: "shadow",  label: "Shadow",  icon: "◻" },
  { id: "caption", label: "Caption", icon: "▤" },
];

export default function TextToolRow({ activeTool, onToolTap }) {
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
