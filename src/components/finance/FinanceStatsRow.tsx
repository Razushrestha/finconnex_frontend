import { Coins, Wallet, LineChart, Calendar } from "lucide-react";
import { FinanceStatCard } from "./FinanceStatCard";

export function FinanceStatsRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
      <FinanceStatCard
        icon={Coins}
        iconColorClass="bg-emerald-50 text-emerald-500"
        label="Total Revenue"
        value="$120,540"
      />
      <FinanceStatCard
        icon={Wallet}
        iconColorClass="bg-rose-50 text-rose-500"
        label="Total Expenses"
        value="$84,320"
      />
      <FinanceStatCard
        icon={LineChart}
        iconColorClass="bg-indigo-50 text-indigo-500"
        label="Net Profit"
        value="$36,220"
      />
      <FinanceStatCard
        icon={Calendar}
        iconColorClass="bg-amber-50 text-amber-500"
        label="Pending Invoices"
        value="12"
      />
    </div>
  );
}
