interface WinBarProps {
  label?: string;
  tone?: "white" | "pink" | "purple" | "yellow" | "mint" | "orange";
}

/**
 * Recreates the little "desktop window" title bar from the reference
 * illustration: a row of dots top-left, optional centered label, thick
 * black bottom border. Used to top every card/panel in the app so the
 * whole UI reads as a set of retro OS windows.
 */
export default function WinBar({ label, tone = "white" }: WinBarProps) {
  return (
    <div className={`winbar winbar--${tone}`}>
      <span className="winbar-dots" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      {label && <span className="winbar-label">{label}</span>}
    </div>
  );
}
