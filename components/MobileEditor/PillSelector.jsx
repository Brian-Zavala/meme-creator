export default function PillSelector({ items, value, onSelect, getId, getLabel, getStyle }) {
  return (
    <div className="flex items-center gap-2 w-full overflow-x-auto h-full px-2 scrollbar-none">
      {items.map((item) => {
        const id = getId(item);
        const label = getLabel(item);
        const style = getStyle ? getStyle(item) : {};
        const isActive = value === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(item)}
            className="tool-pill shrink-0"
            data-active={isActive || undefined}
            style={style}
          >
            {item.icon && typeof item.icon === "string" && !item.icon.includes("/") && (
              <span className="text-sm leading-none">{item.icon}</span>
            )}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
