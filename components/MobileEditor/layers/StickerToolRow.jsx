import ToolPill from "../ToolPill";

const CATEGORIES = [
  { id: "recent",    label: "Recent" },
  { id: "trending",  label: "Trending" },
  { id: "memes",     label: "Memes" },
  { id: "animals",   label: "Animals" },
  { id: "reactions", label: "Reactions" },
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
        <span className="text-sm leading-none">🔍</span>
        <span>Search…</span>
      </button>

      {CATEGORIES.map(({ id, label }) => (
        <ToolPill
          key={id}
          icon={null}
          label={label}
          isActive={activeTool === id}
          onClick={() => onToolTap(id)}
        />
      ))}
    </>
  );
}
