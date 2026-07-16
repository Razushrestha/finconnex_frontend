interface GaugeChartProps {
  percentage: number;
  label: string;
}

export function GaugeChart({ percentage, label }: GaugeChartProps) {
  const radius = 80;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = Math.PI * normalizedRadius; // half circle
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={radius * 2}
        height={radius + strokeWidth}
        viewBox={`0 0 ${radius * 2} ${radius + strokeWidth}`}
      >
        {/* Track */}
        <path
          d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${
            radius * 2 - strokeWidth / 2
          } ${radius}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${
            radius * 2 - strokeWidth / 2
          } ${radius}`}
          fill="none"
          stroke="#6366f1"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      <div className="-mt-14 flex flex-col items-center">
        <span className="text-2xl font-semibold text-slate-800">
          {percentage}%
        </span>
        <span className="mt-1 text-sm text-slate-400">{label}</span>
      </div>
    </div>
  );
}
