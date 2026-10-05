import { describe, expect, it } from "vitest";
import {
  overlayExecutiveOverview,
  overlayPerformanceDashboard,
  overlaySalesDashboard,
} from "@/lib/dashboard/overlay";
import { emptyExecutiveOverview } from "@/lib/dashboard/executive";
import { computePerformanceDashboard } from "@/lib/dashboard/performance";
import { computeSalesDashboard } from "@/lib/dashboard/sales";
import { defaultDashboardFilters } from "@/lib/dashboard/layout";
import { workQueueFromCrm } from "@/lib/dashboard/work-queue-board";

const metrics = {
  totalLeads: 8,
  openDeals: 3,
  wonDeals: 2,
  lostDeals: 1,
  pipelineValue: 250000,
  settlementValue: 90000,
  commission: 1200,
  avgDealSize: 45000,
  qualifiedLeads: 4,
  appointments: 2,
  newLeads: 8,
  bottleneck: "Proposal",
  bottleneckDays: 12,
  summary: "8 new leads and 3 open deals in view.",
  funnel: [{ label: "Proposal", count: 3, value: 250000 }],
  pipelineByStage: [{ label: "Proposal", value: 250000 }],
  sources: [{ name: "Website", leads: 5, deals: 2, conversion: 40, pipeline: 80000, value: 5 }],
  loanTypes: [{ name: "Purchase", leads: 3, deals: 0, conversion: 0, pipeline: 0, value: 3 }],
  lostReasons: [{ name: "Price", leads: 0, deals: 1, conversion: 0, pipeline: 10000, value: 1 }],
  brokers: [{ name: "Ada", leads: 0, deals: 2, conversion: 0, pipeline: 80000, value: 2 }],
  trend: [
    {
      label: "Oct",
      leads: 8,
      deals: 3,
      settlements: 2,
      settlementValue: 90000,
      revenue: 90000,
      avgDeal: 45000,
    },
  ],
  stageTimes: [{ stage: "Proposal", days: 12, delta: 0 }],
  team: [{ name: "Ada", settlements: 2, value: 90000, commission: 1200, conversion: 25 }],
  alerts: [
    {
      title: "Overdue tasks",
      body: "2 tasks are past due.",
      href: "/activities/tasks",
      tone: "rose",
    },
  ],
};

describe("dashboard section overlay", () => {
  const filters = defaultDashboardFilters();

  it("fills executive, sales, and performance sections from CRM metrics", () => {
    const executive = overlayExecutiveOverview(emptyExecutiveOverview(), metrics);
    expect(executive.pipelineValue).toBe(250000);
    expect(executive.funnel[0]?.label).toBe("Proposal");
    expect(executive.sources[0]?.name).toBe("Website");
    expect(executive.alerts[0]?.title).toBe("Overdue tasks");
    expect(executive.summary).toMatch(/8 new leads/);

    const sales = overlaySalesDashboard(computeSalesDashboard(filters), metrics);
    expect(sales.pipelineValue).toBe(250000);
    expect(sales.loanTypes[0]?.name).toBe("Purchase");
    expect(sales.lostReasons[0]?.name).toBe("Price");
    expect(sales.topBrokers[0]?.name).toBe("Ada");

    const performance = overlayPerformanceDashboard(
      computePerformanceDashboard(filters),
      metrics,
    );
    expect(performance.settlementValue).toBe(90000);
    expect(performance.pipelineByStage[0]?.value).toBe(250000);
    expect(performance.team[0]?.name).toBe("Ada");
    expect(performance.trend[0]?.label).toBe("Oct");
  });

  it("maps the work queue payload", () => {
    const queue = workQueueFromCrm({
      overdueTasks: 1,
      tasksDueToday: 1,
      followUpsDue: 0,
      documentsPending: 0,
      appointmentsToday: 0,
      slaBreaches: 0,
      tasksToday: [
        {
          id: "t1",
          title: "Call Ada",
          related: "Deal",
          owner: "Sam",
          when: "5 Oct",
          extra: "High",
          tone: "amber",
        },
      ],
      followUps: [],
      documents: [],
      appointments: [],
      missed: [],
      stale: [],
      approvals: [{ label: "Documents to review", value: 0 }],
      lenders: [],
      urgent: [],
    });
    expect(queue?.overdueTasks).toBe(1);
    expect(queue?.tasksToday[0]?.title).toBe("Call Ada");
  });
});
