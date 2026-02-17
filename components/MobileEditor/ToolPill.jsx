export default function ToolPill({ icon, label, isActive, onClick, className = "" }) {
  return (
    <button
      className={`tool-pill ${className}`}
      data-active={isActive || undefined}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
