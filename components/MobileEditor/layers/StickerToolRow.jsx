import { Search, Clock, TrendingUp, Laugh, PawPrint, SmilePlus } from "lucide-react";
import ToolPill from "../ToolPill";

const CATEGORIES = [
  { id: "recent",    label: "Recent",    Icon: Clock },
  { id: "trending",  label: "Trending",  Icon: TrendingUp },
  { id: "memes",     label: "Memes",     Icon: Laugh },
  { id: "animals",   label: "Animals",   Icon: PawPrint },
  { id: "reactions", label: "Reactions", Icon: SmilePlus },
];

export default function StickerToolRow({ activeTool, onToolTap }) {
  return (
    <>
      {/* Search trigger pill */}
      <button
        type="button"
        onClick={() => onToolTap("search")}
        className="tool-pill"
        data-active={activeTool === "search" || undefined}
      >
        <Search className="w-4 h-4" />
        <span>Search</span>
      </button>

      {CATEGORIES.map(({ id, label, Icon }) => (
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
