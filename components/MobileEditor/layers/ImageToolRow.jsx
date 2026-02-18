import {
  Sun,
  Contrast,
  Waves,
  Palette,
  CircleDot,
  Droplets,
  Clock,
  ArrowUpDown,
  Flame,
  Scissors,
} from "lucide-react";
import ToolPill from "../ToolPill";

const TOOLS = [
  { id: "crop",       label: "Crop",     Icon: Scissors },
  { id: "brightness", label: "Bright",   Icon: Sun },
  { id: "contrast",   label: "Contrast", Icon: Contrast },
  { id: "blur",       label: "Blur",     Icon: Waves },
  { id: "hue",        label: "Hue",      Icon: Palette },
  { id: "grayscale",  label: "Gray",     Icon: CircleDot },
  { id: "saturate",   label: "Saturate", Icon: Droplets },
  { id: "sepia",      label: "Sepia",    Icon: Clock },
  { id: "invert",     label: "Invert",   Icon: ArrowUpDown },
  { id: "deepfry",    label: "Deep Fry", Icon: Flame },
];

export default function ImageToolRow({ activeTool, onToolTap }) {
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
