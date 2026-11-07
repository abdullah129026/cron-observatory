// Product mark: a radar-sweep circle, one ring with a single hand
// at two o'clock, drawn in ink. Favicon, header, footer (DESIGN 1).
export default function RadarMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="10" y1="10" x2="15" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
    </svg>
  );
}
