/**
 * Decorative bottom-of-screen scene echoing the reference illustration:
 * jagged mountains, a crescent moon, clouds and sparkles. Fixed to the
 * viewport, sits behind the page content (z-index handled in CSS).
 * Used sparingly — only on auth screens and the day-complete celebration —
 * so the rest of the app stays calm and usable.
 */
export default function RetroScene() {
  return (
    <svg
      className="retro-scene"
      viewBox="0 0 1200 280"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g fill="#ffffff">
        <path d="M150 36 l5 14 14 5 -14 5 -5 14 -5 -14 -14 -5 14 -5z" />
        <path d="M905 86 l4 11 11 4 -11 4 -4 11 -4 -11 -11 -4 11 -4z" />
        <path d="M1055 38 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" />
        <path d="M60 150 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" />
      </g>
      <g fill="#ffffff" stroke="#14141A" strokeWidth="3.5" strokeLinejoin="round">
        <path d="M40 110c2-16 16-26 31-24 4-15 18-25 33-22 16-3 31 7 34 23 14 1 23 13 21 26H30c-10 0-13-9 10-3z" />
        <path d="M860 60c2-14 14-23 28-21 4-13 16-22 29-19 14-3 27 6 30 20 12 1 20 11 18 23H852c-9 0-12-8 8-3z" />
      </g>
      <path
        d="M1100 30a55 55 0 1 0 0 110 70 70 0 1 1 0 -110z"
        fill="#FAAF3C"
        stroke="#14141A"
        strokeWidth="3.5"
      />
      <g stroke="#14141A" strokeWidth="4" strokeLinejoin="round">
        <polygon points="-10,280 160,70 260,160 380,30 560,280" fill="#E9E9ED" />
        <polygon points="480,280 660,90 800,280" fill="#D6D6DC" />
        <polygon points="720,280 900,50 1060,180 1210,30 1210,280" fill="#E9E9ED" />
      </g>
    </svg>
  );
}
