export function RiskContourSignal({ className }: { className?: string }) {
  const rings = [64, 108, 152, 196, 240];

  return (
    <svg
      viewBox="0 0 480 480"
      className={className}
      role="img"
      aria-label="Concentric risk contours radiating outward from a detected flood point"
    >
      <defs>
        <radialGradient id="signal-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E8A33D" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#E8A33D" stopOpacity="0" />
        </radialGradient>
      </defs>

      {rings.map((radius, index) => (
        <circle
          key={radius}
          cx="240"
          cy="240"
          r={radius}
          fill="none"
          stroke="#F3F6F4"
          strokeOpacity={0.16 - index * 0.02}
          strokeWidth={1}
        />
      ))}

      <circle cx="240" cy="240" r="90" fill="url(#signal-core)" />

      <circle cx="240" cy="240" r="8" fill="#E8A33D" />
      <circle cx="240" cy="240" r="8" fill="none" stroke="#E8A33D" strokeWidth="1.5" className="animate-signal-pulse" style={{ transformOrigin: "240px 240px" }} />
    </svg>
  );
}
