"use client";

import React from "react";
import { TopMetricCards } from "./TopMetricCards";
import { RevenueExpensesChart } from "./RevenueExpensesChart";
import { QuickActions } from "./QuickActions";
import { RecentActivity } from "./RecentActivity";

export const SalesOpsHubClient: React.FC = () => {
  return (
    <div className="w-full min-h-full h-auto bg-background/95 text-foreground p-6 overflow-y-auto pb-16">
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
