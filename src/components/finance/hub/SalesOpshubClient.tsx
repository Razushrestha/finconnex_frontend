"use client";

import { useEffect, useState } from "react";
import { FinanceOpsShell } from "@/components/finance/FinanceOpsShell";
import { TopMetricCards } from "./TopMetricCards";
import { RevenueExpensesChart } from "./RevenueExpensesChart";
import { QuickActions } from "./QuickActions";
import { RecentActivity } from "./RecentActivity";
import { HubPromoBanner } from "./HubPromoBanner";
import {
  loadFinanceHubSnapshot,
  type FinanceHubSnapshot,
} from "@/lib/finance/hub-metrics";
import { mockData } from "@/lib/hub/types";

const EMPTY: FinanceHubSnapshot = {
  totalRevenue: 0,
  revenueDeltaLabel: "Year to date receipts",
  pendingEstimates: 0,
  pendingEstimateValue: 0,
  overdueInvoices: 0,
  overdueTotal: 0,
  quoteConversion: 0,
  quoteConversionLabel: "Accepted vs decided quotes",
  chart: mockData["6m"],
  activity: [],
};

export function SalesOpsHubClient() {
  const [snap, setSnap] = useState<FinanceHubSnapshot>(EMPTY);

  useEffect(() => {
    setSnap(loadFinanceHubSnapshot());
  }, []);

  return (
    <FinanceOpsShell title="Hub" section="§20">
      <TopMetricCards
        totalRevenue={snap.totalRevenue}
        revenueDeltaLabel={snap.revenueDeltaLabel}
        pendingEstimates={snap.pendingEstimates}
        pendingEstimateValue={snap.pendingEstimateValue}
        overdueInvoices={snap.overdueInvoices}
        overdueTotal={snap.overdueTotal}
        quoteConversion={snap.quoteConversion}
        quoteConversionLabel={snap.quoteConversionLabel}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <RevenueExpensesChart liveSixMonth={snap.chart} />
          <QuickActions />
        </div>
        <div className="flex flex-col gap-5">
          <RecentActivity items={snap.activity} />
          <HubPromoBanner />
        </div>
      </div>
    </FinanceOpsShell>
  );
}

export default SalesOpsHubClient;
