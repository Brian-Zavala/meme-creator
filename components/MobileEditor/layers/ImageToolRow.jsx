import {
  Sun,
  CircleHalf,
  Waves,
  Palette,
  Record,
  Drop,
  Clock,
  ArrowsVertical,
  Fire,
  Scissors,
} from "@phosphor-icons/react";
import ToolPill from "../ToolPill";
import SlidingPillRow from "../SlidingPillRow";

const TOOLS = [
  { id: "crop",       label: "Crop",     Icon: Scissors },
  { id: "brightness", label: "Bright",   Icon: Sun },
  { id: "contrast",   label: "Contrast", Icon: CircleHalf },
  { id: "blur",       label: "Blur",     Icon: Waves },
  { id: "hue",        label: "Hue",      Icon: Palette },
  { id: "grayscale",  label: "Gray",     Icon: Record },
  { id: "saturate",   label: "Saturate", Icon: Drop },
  { id: "sepia",      label: "Sepia",    Icon: Clock },
  { id: "invert",     label: "Invert",   Icon: ArrowsVertical },
  { id: "deepfry",    label: "Deep Fry", Icon: Fire },
];

export default function ImageToolRow({ activeTool, onToolTap }) {
  return (
    <SlidingPillRow activeId={activeTool}>
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
