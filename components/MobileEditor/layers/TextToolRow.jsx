import {
  PlusCircle,
  TextAa,
  ArrowsVertical,
  Palette,
  ArrowsHorizontal,
  ArrowsOutLineHorizontal,
  Sparkle,
  PaintBucket,
  Stack,
  ClosedCaptioning,
} from "@phosphor-icons/react";
import ToolPill from "../ToolPill";
import SlidingPillRow from "../SlidingPillRow";

const TOOLS = [
  { id: "font",    label: "Font",    Icon: TextAa },
  { id: "size",    label: "Size",    Icon: ArrowsVertical },
  { id: "color",   label: "Color",   Icon: Palette },
  { id: "width",   label: "Width",   Icon: ArrowsHorizontal },
  { id: "spacing", label: "Spacing", Icon: ArrowsOutLineHorizontal },
  { id: "anim",    label: "Anim",    Icon: Sparkle },
  { id: "bg",      label: "BG",      Icon: PaintBucket },
  { id: "shadow",  label: "Shadow",  Icon: Stack },
  { id: "caption", label: "Caption", Icon: ClosedCaptioning },
];

export default function TextToolRow({ activeTool, onToolTap, onAddText }) {
  return (
    <SlidingPillRow activeId={activeTool}>
      <button
        type="button"
        onClick={onAddText}
        className="tool-pill add-text-pill"
      >
        <PlusCircle size={16} />
        <span>Add</span>
      </button>
      {TOOLS.map(({ id, label, Icon }) => (
        <ToolPill
          key={id}
          icon={<Icon size={16} />}
          label={label}
          isActive={activeTool === id}
          onClick={() => onToolTap(id)}
        />
      ))}
    </SlidingPillRow>
  );
}
