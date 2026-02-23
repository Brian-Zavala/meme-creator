import { MagnifyingGlass, TrendUp, Smiley, PawPrint, SmileySticker } from "@phosphor-icons/react";
import ToolPill from "../ToolPill";
import SlidingPillRow from "../SlidingPillRow";

const CATEGORIES = [
  { id: "trending",  label: "Trending",  Icon: TrendUp },
  { id: "memes",     label: "Memes",     Icon: Smiley },
  { id: "animals",   label: "Animals",   Icon: PawPrint },
  { id: "reactions", label: "Reactions", Icon: SmileySticker },
];

export default function StickerToolRow({ activeTool, onToolTap }) {
  return (
    <SlidingPillRow activeId={activeTool}>
      {/* Search trigger pill */}
      <button
        type="button"
        onClick={() => onToolTap("search")}
        className="tool-pill"
        data-active={activeTool === "search" || undefined}
      >
        <MagnifyingGlass size={16} />
        <span>Search</span>
      </button>

      {CATEGORIES.map(({ id, label, Icon }) => (
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
