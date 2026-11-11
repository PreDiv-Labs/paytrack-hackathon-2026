export function SpendingSparkline({ values }: { values: number[] }) {
  const maximum = Math.max(...values, 1);
  const points = values.map(
    (value, index) =>
      `${(index / Math.max(values.length - 1, 1)) * 280},${48 - (value / maximum) * 38}`,
  );
  const line = `M ${points.join(" L ")}`;
  return (
    <svg
      className="spending-sparkline"
      viewBox="0 0 280 56"
      preserveAspectRatio="none"
      role="img"
      aria-label="Daily recorded outgoing activity"
    >
      <defs>
        <linearGradient id="spending-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b787ff" stopOpacity=".45" />
          <stop offset="100%" stopColor="#b787ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L 280 56 L 0 56 Z`} fill="url(#spending-fill)" />
      <path
        d={line}
        fill="none"
        stroke="#c39aff"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
