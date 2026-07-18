"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  MoreHorizontal,
  Download,
} from "lucide-react";
import {
  MiniBarChart,
  MiniLineChart,
  DonutChart,
} from "./DashboardCharts";
import { Card, CardHeader, ChangeBadge } from "./card-primitives";

const contactsData = [4, 20, 45, 65, 55, 30, 42].map((value) => ({ value }));
const leadData = [30, 45, 20, 50, 35, 60, 40, 55].map((value) => ({ value }));
const taskLegend = [
  { label: "Follow-ups", color: "bg-violet-200" },
  { label: "In Progress", color: "bg-violet-300" },
  { label: "Pending", color: "bg-violet-600" },
];
const taskDonutData = [
  { value: 40, color: "#EDE9FE" },
  { value: 35, color: "#C4B5FD" },
  { value: 25, color: "#7C3AED" },
];
const trafficBars = [20, 55, 75, 90].map((value) => ({ value }));
const trafficSources = [
  { label: "Organic Search", value: "41.50%", color: "bg-violet-100" },
  { label: "Direct Traffic", value: "27%", color: "bg-violet-200" },
  { label: "Referral Traffic", value: "18%", color: "bg-violet-400" },
  { label: "Social Media", value: "10.30%", color: "bg-violet-600" },
  { label: "Email Traffic", value: "3.20%", color: "bg-violet-900" },
];
const earningDonutData = [
  { value: 70, color: "rgba(255,255,255,0.9)" },
  { value: 30, color: "rgba(255,255,255,0.25)" },
];
const orderStatus = [
  { label: "Paid", value: "70%", color: "bg-white" },
  { label: "Cancelled", value: "25%", color: "bg-white/60" },
  { label: "Refunded", value: "5%", color: "bg-white/30" },
];

function TotalContactsCard() {
  return (
    <Card>
      <CardHeader title="Total Contacts" />
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold text-gray-900">5,758</span>
        <ChangeBadge value={2.57} />
      </div>
      <div className="mt-2">
        <MiniBarChart data={contactsData} />
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
        <span className="text-gray-500">Vs last month: 1,195</span>
        <ArrowRight className="h-4 w-4 text-violet-600" />
      </div>
    </Card>
  );
}

function LeadAnalyticsCard() {
  return (
    <Card className="justify-between overflow-hidden p-0">
      <div className="p-5 pb-0">
        <CardHeader title="Lead Analytics" />
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-gray-900">70</span>
          <ChangeBadge value={-2.57} />
        </div>
      </div>
      <div className="mt-4 rounded-b-2xl bg-violet-600 px-5 pt-4">
        <MiniLineChart data={leadData} />
        <p className="pb-3 text-center text-sm text-violet-100">
          Compared to Last Month
        </p>
      </div>
    </Card>
  );
}

function TasksOverviewCard() {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-gray-900">
          Tasks Overview
        </h3>
        <span className="text-sm text-gray-500">
          Tasks Done <span className="font-semibold text-violet-600">25</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full w-3/5 rounded-full bg-violet-600" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <ul className="flex flex-col gap-3">
          {taskLegend.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 text-sm text-gray-600"
            >
              <span className={cn("h-2.5 w-2.5 rounded-sm", item.color)} />
              {item.label}
            </li>
          ))}
        </ul>
        <DonutChart
          data={taskDonutData}
          size={96}
          thickness={12}
          centerLabel={
            <span className="text-xl font-bold text-gray-900">15</span>
          }
        />
      </div>
    </Card>
  );
}

function ActiveDealsCard() {
  return (
    <Card>
      <CardHeader title="Active Deals" />
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold text-gray-900">1,249</span>
        <ChangeBadge value={2.57} />
      </div>
      <div className="mt-14" />
      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
        <span className="text-gray-500">Vs last month: 1,195</span>
        <ArrowRight className="h-4 w-4 text-violet-600" />
      </div>
    </Card>
  );
}

function TrafficSourcesCard() {
  return (
    <Card className="h-full justify-between">
      <div>
        <CardHeader title="Traffic Sources" />
        <MiniBarChart data={trafficBars} />
        <ul className="mt-4 flex flex-col gap-3">
          {trafficSources.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2 text-gray-600">
                <span className={cn("h-3 w-3 rounded-sm", item.color)} />
                {item.label}
              </span>
              <span className="font-medium text-gray-900">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
        <span className="text-sm font-medium text-gray-900">Annual report</span>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </div>
    </Card>
  );
}

function TotalEarningCard() {
  return (
    <Card className="h-full justify-between border-none bg-gradient-to-br from-violet-500 to-violet-800 text-white">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">Total Earning</h3>
          <MoreHorizontal className="h-[18px] w-[18px] text-white/70" />
        </div>
        <div className="flex flex-col items-center py-2">
          <DonutChart
            data={earningDonutData}
            size={140}
            thickness={10}
            centerLabel={
              <div className="text-center">
                <p className="text-2xl font-bold">$5.7m</p>
                <p className="text-xs text-white/80">673 Orders</p>
              </div>
            }
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm bg-white" />
            <div>
              <p className="text-sm font-semibold">$2.78m</p>
              <p className="text-xs text-white/70">245 Pickups</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm bg-white/40" />
            <div>
              <p className="text-sm font-semibold">$65,820</p>
              <p className="text-xs text-white/70">120 Shipments</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 border-t border-white/20 pt-4">
        <h4 className="mb-3 text-sm font-semibold">Orders Status</h4>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div className="h-full bg-white" style={{ width: "70%" }} />
          <div className="h-full bg-white/60" style={{ width: "25%" }} />
          <div className="h-full bg-white/30" style={{ width: "5%" }} />
        </div>
        <ul className="mt-4 flex flex-col gap-2.5">
          {orderStatus.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-sm", item.color)} />
                {item.label}
              </span>
              <span className="font-medium">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export function DashboardMetricsSection() {
  return (
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
  );
}
