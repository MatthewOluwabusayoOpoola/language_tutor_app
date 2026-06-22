/**
 * A quiet cousin of <RetroScene />: drifting clouds and twinkling stars
 * scattered down the full page, low-opacity, never competing with content.
 * Used on the dashboard and conversation pages so the whole app feels
 * animated without the full mountains/sun/moon hero. Elements are kept
 * below the header band (~y > 140) so the opaque header never just hides
 * them outright.
 */
export default function AmbientSky() {
  return (
    <svg
      className="ambient-sky"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMin meet"
      aria-hidden="true"
    >
      <g fill="#ffffff" opacity="0.85">
        <path
          className="star star--1"
          d="M260 220 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z"
        />
        <path
          className="star star--3"
          d="M1320 360 l4 11 11 4 -11 4 -4 11 -4 -11 -11 -4 11 -4z"
        />
        <path
          className="star star--5"
          d="M120 620 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z"
        />
        <path
          className="star star--2"
          d="M1450 700 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z"
        />
      </g>
      <g fill="#ffffff" stroke="#14141A" strokeWidth="3" strokeLinejoin="round">
        <g transform="translate(-260,180)">
          <g className="cloud cloud--b">
            <path d="M0 20c2-11 11-18 22-16 3-10 13-17 23-15 11-3 21 5 24 16 9 1 15 8 14 17H-8c-8 0-9-7 8-2z" />
          </g>
        </g>
        <g transform="translate(-620,420)">
          <g className="cloud cloud--c">
            <path d="M0 16c1-9 9-14 18-13 3-8 10-13 18-12 9-2 17 4 19 13 7 1 12 6 11 13H-6c-6 0-7-5 6-1z" />
          </g>
        </g>
        <g transform="translate(-420,650)">
          <g className="cloud cloud--a">
            <path d="M0 18c1-10 10-16 19-15 3-9 11-15 20-13 10-2 19 4 21 14 8 1 14 7 12 15H-7c-7 0-8-6 7-1z" />
          </g>
        </g>
        <g transform="translate(-820,280)">
          <g className="cloud cloud--d">
            <path d="M0 14c1-8 8-13 16-12 2-7 9-12 16-10 8-2 15 3 17 11 6 1 10 5 10 11H-5c-5 0-6-4 5-1z" />
          </g>
        </g>
      </g>
    </svg>
  );
}
