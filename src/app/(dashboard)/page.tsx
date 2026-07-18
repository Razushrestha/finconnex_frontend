import dynamic from "next/dynamic";
import { Suspense } from "react";
import {
  DashboardBreadcrumb,
  OrderByTimeCard,
  UpcomingMeetingsCard,
} from "@/components/dashboard/static-cards";
import { CardGridSkeleton, ChartSkeleton } from "@/components/ui/chart-skeleton";

const DashboardMetricsSection = dynamic(
  () =>
    import("@/components/dashboard/DashboardMetricsSection").then(
      (m) => m.DashboardMetricsSection,
    ),
  { loading: () => <CardGridSkeleton count={4} /> },
);

const DashboardAnalyticsSection = dynamic(
  () =>
    import("@/components/dashboard/DashboardAnalyticsSection").then(
      (m) => m.DashboardAnalyticsSection,
    ),
  { loading: () => <CardGridSkeleton count={2} /> },
);

const NewCustomersTable = dynamic(
  () => import("@/components/dashboard/NewCustomersTable"),
  { loading: () => <ChartSkeleton className="min-h-[420px]" /> },
);

const TaskUpdateCard = dynamic(
  () => import("@/components/dashboard/TaskUpdateCard"),
  { loading: () => <ChartSkeleton className="min-h-[420px]" /> },
);

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 bg-zinc-50 p-6">
      <DashboardBreadcrumb />

      <Suspense fallback={<CardGridSkeleton count={4} />}>
        <DashboardMetricsSection />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Suspense fallback={<CardGridSkeleton count={2} />}>
            <DashboardAnalyticsSection />
          </Suspense>
        </div>
        <OrderByTimeCard />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <UpcomingMeetingsCard />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]">
        <div className="min-w-0">
          <Suspense fallback={<ChartSkeleton className="min-h-[420px]" />}>
            <NewCustomersTable />
          </Suspense>
        </div>
        <Suspense fallback={<ChartSkeleton className="min-h-[420px]" />}>
          <TaskUpdateCard />
        </Suspense>
      </div>
    </div>
  );
}
