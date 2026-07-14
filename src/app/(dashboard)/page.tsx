import {
  DashboardBreadcrumb,
  TotalContactsCard,
  LeadAnalyticsCard,
  TasksOverviewCard,
  ActiveDealsCard,
  TrafficSourcesCard,
  TotalEarningCard,
  RevenueCard,
  RetentionRateCard,
  OrderByTimeCard,
  UpcomingMeetingsCard,
  DealsOverviewCard,
  SalesPipelineOverviewCard,
} from "@/components/dashboard/DashboardCard";
import NewCustomersTable from "@/components/dashboard/NewCustomersTable";
import TaskUpdateCard from "@/components/dashboard/TaskUpdateCard";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 bg-zinc-50 p-6">
      <DashboardBreadcrumb />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="flex flex-col gap-4">
          <TotalContactsCard />
          <TasksOverviewCard />
        </div>
        <div className="flex flex-col gap-4">
          <LeadAnalyticsCard />
          <ActiveDealsCard />
        </div>
        <TrafficSourcesCard />
        <TotalEarningCard />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <RevenueCard />
        </div>
        <RetentionRateCard />
        <OrderByTimeCard />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <UpcomingMeetingsCard />
        <DealsOverviewCard />
        <SalesPipelineOverviewCard />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]">
        <div className="min-w-0">
          <NewCustomersTable />
        </div>
        <TaskUpdateCard />
      </div>
    </div>
  );
}
