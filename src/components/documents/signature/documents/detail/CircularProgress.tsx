import React from "react";

interface CircularProgressProps {
  /** 0–100 */
  percent: number;
  size?: number;
  strokeWidth?: number;
  /** Overrides the default "{percent}%" label. */
  label?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percent,
  size = 96,
  strokeWidth = 8,
  label,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e0f2fe"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-lg font-bold text-sky-500">
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
};
