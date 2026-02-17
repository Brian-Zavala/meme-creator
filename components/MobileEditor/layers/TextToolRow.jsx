import {
  ALargeSmall,
  ArrowUpDown,
  Palette,
  ArrowLeftRight,
  Space,
  Sparkles,
  PaintBucket,
  Layers,
  Subtitles,
} from "lucide-react";
import ToolPill from "../ToolPill";

const TOOLS = [
  { id: "font",    label: "Font",    Icon: ALargeSmall },
  { id: "size",    label: "Size",    Icon: ArrowUpDown },
  { id: "color",   label: "Color",   Icon: Palette },
  { id: "width",   label: "Width",   Icon: ArrowLeftRight },
  { id: "spacing", label: "Spacing", Icon: Space },
  { id: "anim",    label: "Anim",    Icon: Sparkles },
  { id: "bg",      label: "BG",      Icon: PaintBucket },
  { id: "shadow",  label: "Shadow",  Icon: Layers },
  { id: "caption", label: "Caption", Icon: Subtitles },
];

export default function TextToolRow({ activeTool, onToolTap }) {
  return (
    <>
      {TOOLS.map(({ id, label, Icon }) => (
        <ToolPill
          key={id}
          icon={<Icon className="w-4 h-4" />}
          label={label}
          isActive={activeTool === id}
          onClick={() => onToolTap(id)}
        />
      ))}
    </>
  );
}
