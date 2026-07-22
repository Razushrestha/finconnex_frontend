import type { Metadata } from "next";
import { FinancePageHeader } from "@/components/finance/FinancePageHeader";
import { FinanceStatsRow } from "@/components/finance/FinanceStatsRow";
import { MonthlyTargetSidebar } from "@/components/finance/MonthlyTargetSidebar";
import { RecentTransactionsTable } from "@/components/finance/RecentTransactionsTable";
import {
  ExpenseBreakdownCard,
  RevenueExpensesChart,
} from "@/lib/lazy-charts";

export const metadata: Metadata = {
  title: "Finance — FinConnex",
  description: "Revenue, expenses, invoices, and financial reports.",
};

export default function FinancePage() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <FinancePageHeader />

      <div className="mb-6 flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-6">
          <FinanceStatsRow />

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <RevenueExpensesChart />
            <ExpenseBreakdownCard />
          </div>
        </div>

        <div className="w-full lg:w-72 lg:shrink-0">
          <MonthlyTargetSidebar />
        </div>
      </div>

      <div className="w-full">
        <RecentTransactionsTable />
      </div>
    </div>
  );
}
