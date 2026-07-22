"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Download,
  Calendar,
  Check,
  Clock,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  RevenueBarChart,
  RetentionBarChart,
} from "./DashboardCharts";
import { Card, CardHeader } from "./card-primitives";

const revenueTabs = ["Today", "Week", "Month"] as const;
const revenueData = [
  { label: "Jan", value: 110 },
  { label: "Feb", value: 320 },
  { label: "Mar", value: 400 },
  { label: "Apr", value: 100 },
  { label: "May", value: 230 },
  { label: "Jun", value: 180 },
  { label: "Jul", value: 310 },
  { label: "Aug", value: 90 },
  { label: "Sep", value: 260 },
  { label: "Oct", value: 330 },
  { label: "Nov", value: 220 },
  { label: "Dec", value: 150 },
];

const retentionData = [
  { label: "Jan", sme: 30, startups: 15, enterprises: 20 },
  { label: "Feb", sme: 45, startups: 20, enterprises: 10 },
  { label: "Mar", sme: 40, startups: 20, enterprises: 15 },
  { label: "Apr", sme: 15, startups: 25, enterprises: 10 },
  { label: "May", sme: 15, startups: 15, enterprises: 15 },
  { label: "Jun", sme: 20, startups: 15, enterprises: 15 },
];

const retentionLegend = [
  { label: "SMEs", color: "bg-violet-800" },
  { label: "Startups", color: "bg-violet-300" },
  { label: "Enterprises", color: "bg-violet-100" },
];

const dealsChartData = [
  { value: 80 },
  { value: 80 },
  { value: 40 },
  { value: 40 },
  { value: 80 },
  { value: 80 },
  { value: 40 },
  { value: 40 },
  { value: 65 },
  { value: 90 },
  { value: 90 },
];

const pipelineStages = [
  {
    label: "Leads",
    value: 120,
    max: 120,
    track: "bg-violet-100",
    fill: "bg-violet-200",
  },
  {
    label: "Prospects",
    value: 85,
    max: 120,
    track: "bg-emerald-50",
    fill: "bg-emerald-100",
  },
  {
    label: "Opportunities",
    value: 40,
    max: 120,
    track: "bg-violet-50",
    fill: "bg-violet-100",
  },
  {
    label: "Closed Deals",
    value: 20,
    max: 120,
    track: "bg-red-50",
    fill: "bg-red-100",
  },
];

function RevenueCard() {
  const [active, setActive] =
    React.useState<(typeof revenueTabs)[number]>("Month");

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-gray-900">Revenue</h3>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-gray-100 p-1">
            {revenueTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActive(tab)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Pick date"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-gray-900">
          $2,56,054.<span className="text-violet-600">50</span>
        </span>
        <span className="text-sm text-emerald-600">+20% vs last month</span>
      </div>
      <div className="mt-2">
        <RevenueBarChart data={revenueData} />
      </div>
    </Card>
  );
}

function RetentionRateCard() {
  return (
    <Card>
      <CardHeader title="Retention Rate" />
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold text-gray-900">92%</span>
        <span className="text-sm text-emerald-600">+15% vs last month</span>
      </div>
      <div className="mt-2">
        <RetentionBarChart data={retentionData} />
      </div>
      <div className="mt-2 flex items-center gap-4">
        {retentionLegend.map((item) => (
          <span
            key={item.label}
            className="flex items-center gap-1.5 text-xs text-gray-500"
          >
            <span className={cn("h-2.5 w-2.5 rounded-sm", item.color)} />
            {item.label}
          </span>
        ))}
      </div>
    </Card>
  );
}

function DealsOverviewCard() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-gray-900">
              Deals Overview
            </h3>
            <span className="text-sm text-gray-400">+15% vs last month</span>
          </div>
          <button
            type="button"
            aria-label="More options"
            className="text-gray-400 hover:text-gray-600"
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <Check className="h-4 w-4 text-gray-500" />
            </span>
            <div>
              <p className="text-xs text-gray-500">Closed Deals</p>
              <p className="text-xl font-bold text-gray-900">
                27
                <span className="ml-1 text-xs font-medium text-emerald-500">
                  +10
                </span>
                <span className="ml-1 text-xs font-medium text-gray-400">
                  Deals
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <Clock className="h-4 w-4 text-gray-500" />
            </span>
            <div>
              <p className="text-xs text-gray-500">Pipeline Value</p>
              <p className="text-xl font-bold text-gray-900">
                $5.2M
                <span className="ml-1 text-xs font-medium text-emerald-500">
                  +$270k
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="relative h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dealsChartData}>
            <defs>
              <linearGradient id="dealsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <Area
              type="stepAfter"
              dataKey="value"
              stroke="#6D28D9"
              strokeWidth={2.5}
              fill="url(#dealsFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <div className="rounded-2xl bg-white px-5 py-3 text-center shadow-lg">
            <p className="text-sm font-semibold text-gray-900">
              Conversion Rate <span className="text-violet-600">16%</span>
            </p>
            <p className="text-sm font-semibold text-red-500">-2%</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SalesPipelineOverviewCard() {
  return (
    <Card className="p-0">
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-gray-900">
            Sales Pipeline Overview
          </h3>
          <button
            type="button"
            aria-label="More options"
            className="text-gray-400 hover:text-gray-600"
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="mb-5 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">
            $2,56,054.<span className="text-violet-600">50</span>
          </span>
          <span className="text-sm text-emerald-600">+20% vs last month</span>
        </div>
        <div className="flex flex-col gap-1">
          {pipelineStages.map((stage) => (
            <div
              key={stage.label}
              className={cn(
                "relative h-12 overflow-hidden rounded-xl",
                stage.track,
              )}
            >
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-xl",
                  stage.fill,
                )}
                style={{ width: `${(stage.value / stage.max) * 100}%` }}
              />
              <div className="relative flex h-full items-center justify-between px-4">
                <span className="text-sm font-medium text-gray-800">
                  {stage.label}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {stage.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
        <span className="text-sm font-medium text-gray-900">Annual report</span>
        <Button size="sm" variant="outline" className="gap-1.5 text-violet-600">
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </div>
    </Card>
  );
}

export function DashboardChartRow() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <RevenueCard />
      </div>
      <RetentionRateCard />
    </div>
  );
}

export function DashboardDealsRow() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <DealsOverviewCard />
      <SalesPipelineOverviewCard />
    </div>
  );
}
