/**
 * A generic radial "alert burst": a small centre dot surrounded by evenly
 * spaced rays. Drawn from scratch (our own geometric rendition, not a copy of
 * any specific logo file). Uses currentColor so it inherits the surrounding
 * text colour.
 */
const RAY_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

export function RaddningstjanstSymbol({
  size = 40,
  title = 'Räddningstjänsten',
}: {
  size?: number;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* radiating rays, evenly spaced around the centre */}
      <g stroke="currentColor" strokeWidth="3.4" strokeLinecap="round">
        {RAY_ANGLES.map(a => (
          <line key={a} x1="24" y1="16.5" x2="24" y2="8.5" transform={`rotate(${a} 24 24)`} />
        ))}
      </g>
      {/* centre dot */}
      <rect x="21.4" y="21.4" width="5.2" height="5.2" rx="1.2" fill="currentColor" />
    </svg>
  );
}
