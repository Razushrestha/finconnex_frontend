"use client";

import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/ui/chart-skeleton";

const chartLoading = (className?: string) =>
  function Loading() {
    return <ChartSkeleton className={className} />;
  };

export const RevenueExpensesChart = dynamic(
  () =>
    import("@/components/finance/RevenueExpensesChart").then(
      (m) => m.RevenueExpensesChart,
    ),
  { loading: chartLoading("min-h-[224px] sm:min-h-[256px] lg:min-h-[288px]") },
);

export const ExpenseBreakdownCard = dynamic(
  () =>
    import("@/components/finance/ExpenseBreakdownCard").then(
      (m) => m.ExpenseBreakdownCard,
    ),
  { loading: chartLoading("min-h-[280px]") },
);

export const SalesReportCard = dynamic(
  () =>
    import("@/components/sales/SalesReportCard").then((m) => m.SalesReportCard),
  { loading: chartLoading("min-h-[320px]") },
);

export const TotalVisitorsCard = dynamic(
  () =>
    import("@/components/sales/TotalVisitorsCard").then(
      (m) => m.TotalVisitorsCard,
    ),
  { loading: chartLoading("min-h-[280px]") },
);

export const SalesGrowthCard = dynamic(
  () =>
    import("@/components/sales/SalesGrowthCard").then((m) => m.SalesGrowthCard),
  { loading: chartLoading("min-h-[280px]") },
);

export const NewTeamMembersCard = dynamic(
  () =>
    import("@/components/teams/NewTeamMembersCard").then(
      (m) => m.NewTeamMembersCard,
    ),
  { loading: chartLoading("min-h-[280px]") },
);

export const TeamPerformancesCard = dynamic(
  () =>
    import("@/components/teams/TeamPerformancesCard").then(
      (m) => m.TeamPerformancesCard,
    ),
  { loading: chartLoading("min-h-[320px]") },
);
