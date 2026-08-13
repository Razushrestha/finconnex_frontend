"use client";

import React from "react";
import { TopMetricCards } from "./TopMetricCards";
import { RevenueExpensesChart } from "./RevenueExpensesChart";
import { QuickActions } from "./QuickActions";
import { RecentActivity } from "./RecentActivity";

export const SalesOpsHubClient: React.FC = () => {
  return (
    <div className="h-auto min-h-full w-full overflow-y-auto bg-slate-50 p-6 pb-16 text-slate-900">
      <TopMetricCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RevenueExpensesChart />
          <QuickActions />
        </div>
        <div className="lg:col-span-1">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
};

export default SalesOpsHubClient;
