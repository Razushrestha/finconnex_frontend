import { Wallet, ShoppingCart, LineChart, Target } from "lucide-react";
import { SalesStatCard } from "@/components/sales/SalesStatCard";
import { SalesReportCard } from "@/components/sales/SalesReportCard";
import { MonthlyTargetCard } from "@/components/sales/MonthlyTargetCard";
import { SalesByCountryCard } from "@/components/sales/SalesByCountryCard";
import { TotalVisitorsCard } from "@/components/sales/TotalVisitorsCard";
import { RecentSalesTable } from "@/components/sales/RecentSalesTable";
import { TopSellingItemsTable } from "@/components/sales/TopSellingItemsTable";
import { SalesGrowthCard } from "@/components/sales/SalesGrowthCard";

export default function SalesDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-8">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-sm text-slate-400">
        <a href="/" className="flex items-center gap-1.5 hover:text-slate-600">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Home
        </a>
        <span>&gt;</span>
        <span className="text-slate-500">Sales</span>
      </nav>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <SalesStatCard
          icon={Wallet}
          iconColorClass="bg-indigo-50 text-indigo-500"
          label="Total Earning"
          value="$12,354"
          trend={{ value: "+12.4%", tone: "positive" }}
        />
        <SalesStatCard
          icon={ShoppingCart}
          iconColorClass="bg-emerald-50 text-emerald-500"
          label="Total Orders"
          value="10,654"
          trend={{ value: "+18.2%", tone: "negative" }}
        />
        <SalesStatCard
          icon={LineChart}
          iconColorClass="bg-amber-50 text-amber-500"
          label="Revenue Growth"
          value="+18.5%"
        />
        <SalesStatCard
          icon={Target}
          iconColorClass="bg-rose-50 text-rose-500"
          label="Conversion Rate"
          value="7.6%"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr_1fr] mb-4">
        <SalesReportCard />
        <MonthlyTargetCard />
        <SalesByCountryCard />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2.2fr] mb-4">
        <TotalVisitorsCard />
        <RecentSalesTable />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2.2fr_1fr]">
        <TopSellingItemsTable />
        <SalesGrowthCard />
      </div>
    </div>
  );
}
