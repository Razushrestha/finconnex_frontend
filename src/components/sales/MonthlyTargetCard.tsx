import { GaugeChart } from "./GaugeChart";
import { SalesStatus } from "./SalesStatus";

export function MonthlyTargetCard() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex-grow">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Monthly Target
        </h3>

        <div className="flex justify-center py-2">
          <GaugeChart percentage={75.7} label="32,500 Sales" />
        </div>
      </div>

      <div className="my-6 border-t border-slate-100" />

      <SalesStatus />
    </div>
  );
}
