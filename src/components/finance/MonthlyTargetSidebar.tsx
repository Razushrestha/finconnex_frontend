import { MoreHorizontal } from "lucide-react";

interface MiniStat {
  label: string;
  value: string;
}

const miniStats: MiniStat[] = [
  { label: "Target", value: "$75K" },
  { label: "Revenue", value: "$15k" },
  { label: "Today", value: "$8.5k" },
];

export function MonthlyTargetSidebar() {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-5 text-white shadow-sm sm:p-6">
      <div>
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold sm:text-lg">Monthly Target</h3>
          <button
            type="button"
            aria-label="More options"
            className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* Headline */}
        <div className="mb-6 flex items-baseline gap-2 sm:mb-8">
          <span className="text-3xl font-bold sm:text-4xl">92%</span>
          <span className="text-xs text-white/80 sm:text-sm">
            +15% vs last month
          </span>
        </div>

        {/* Decorative arc gauge */}
        <div className="mb-6 flex flex-col items-center sm:mb-8">
          <div className="w-full max-w-[200px]">
            <svg viewBox="0 0 180 100" width="100%" height="auto">
              <path
                d="M 10 90 A 80 80 0 0 1 170 90"
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={2}
              />
              <path
                d="M 10 90 A 80 80 0 0 1 150 40"
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="-mt-8 flex flex-col items-center sm:-mt-10">
            <span className="text-xl font-bold sm:text-2xl">75K</span>
            <span className="text-xs text-white/70 sm:text-sm">673 Orders</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs leading-relaxed text-white/85 sm:text-sm">
          You earn <span className="font-semibold text-amber-300">$7540</span>{" "}
          today, its higher than last month keep up your good trends!
        </p>
      </div>

      {/* Mini stat tiles */}
      <div className="mt-6 grid grid-cols-3 gap-1.5 rounded-xl bg-white p-3 sm:mt-8 sm:gap-2 sm:p-4">
        {miniStats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-sm font-bold text-slate-900 sm:text-base">
              {stat.value}
            </p>
            <p className="mt-0.5 text-[11px] text-indigo-500 sm:text-xs">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
