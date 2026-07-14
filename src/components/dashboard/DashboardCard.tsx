"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Home,
  ChevronRight,
  ArrowRight,
  MoreHorizontal,
  Download,
  Calendar,
  Plus,
  Check,
  Clock,
  Video,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  MiniBarChart,
  MiniLineChart,
  RevenueBarChart,
  RetentionBarChart,
  DonutChart,
} from "./DashboardCharts";

function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-gray-100 bg-white p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
      {right ?? (
        <button
          type="button"
          aria-label="More options"
          className="text-gray-400 hover:text-gray-600"
        >
          <MoreHorizontal className="h-[18px] w-[18px]" />
        </button>
      )}
    </div>
  );
}

function ChangeBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold",
        positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500",
      )}
    >
      {positive ? "+" : ""}
      {value}%
    </span>
  );
}

export function DashboardBreadcrumb() {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <Home className="h-4 w-4" />
      <span>Home</span>
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="text-gray-600">Dashboard</span>
    </div>
  );
}

const contactsData = [4, 20, 45, 65, 55, 30, 42].map((value) => ({ value }));

export function TotalContactsCard() {
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

const leadData = [30, 45, 20, 50, 35, 60, 40, 55].map((value) => ({ value }));

export function LeadAnalyticsCard() {
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

export function TasksOverviewCard() {
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

export function ActiveDealsCard() {
  return (
    <Card>
      <CardHeader title="Active Deals" />
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold text-gray-900">1,249</span>
        <ChangeBadge value={2.57} />
      </div>
      <div className="mt-14"></div>
      <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
        <span className="text-gray-500">Vs last month: 1,195</span>
        <ArrowRight className="h-4 w-4 text-violet-600" />
      </div>
    </Card>
  );
}

const trafficBars = [20, 55, 75, 90].map((value) => ({ value }));

const trafficSources = [
  { label: "Organic Search", value: "41.50%", color: "bg-violet-100" },
  { label: "Direct Traffic", value: "27%", color: "bg-violet-200" },
  { label: "Referral Traffic", value: "18%", color: "bg-violet-400" },
  { label: "Social Media", value: "10.30%", color: "bg-violet-600" },
  { label: "Email Traffic", value: "3.20%", color: "bg-violet-900" },
];

export function TrafficSourcesCard() {
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

const earningDonutData = [
  { value: 70, color: "rgba(255,255,255,0.9)" },
  { value: 30, color: "rgba(255,255,255,0.25)" },
];

const orderStatus = [
  { label: "Paid", value: "70%", color: "bg-white" },
  { label: "Cancelled", value: "25%", color: "bg-white/60" },
  { label: "Refunded", value: "5%", color: "bg-white/30" },
];

export function TotalEarningCard() {
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

export function RevenueCard() {
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

export function RetentionRateCard() {
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

const orderByTimeHours = ["4pm", "2pm", "12pm", "10am", "8am"];
const orderByTimeDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const orderByTimeGrid = [
  [0.5, 0.55, 0.6, 0.55, 0.5, 0.45, 0.5],
  [0.4, 0.45, 0.5, 0.75, 0.7, 0.4, 0.45],
  [0.55, 0.6, 0.65, 1, 0.6, 0.55, 0.6],
  [0.45, 0.5, 0.55, 0.7, 0.5, 0.45, 0.5],
  [0.15, 0.2, 0.2, 0.25, 0.2, 0.15, 0.2],
];

export function OrderByTimeCard() {
  return (
    <Card>
      <CardHeader title="Order By Time" />
      <div className="flex flex-col gap-2">
        {orderByTimeHours.map((hour, rowIdx) => (
          <div key={hour} className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-xs text-gray-400">{hour}</span>
            <div className="grid flex-1 grid-cols-7 gap-1.5">
              {orderByTimeDays.map((day, colIdx) => (
                <div
                  key={day}
                  className="aspect-square rounded-md bg-violet-600"
                  style={{ opacity: orderByTimeGrid[rowIdx][colIdx] }}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0" />
          <div className="grid flex-1 grid-cols-7 gap-1.5">
            {orderByTimeDays.map((day) => (
              <span key={day} className="text-center text-xs text-gray-400">
                {day}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

const meetings = [
  {
    title: "Team Stand Up",
    tag: "Marketing",
    time: "06:00 - 07:00",
    faded: false,
  },
  {
    title: "All Hands Meeting",
    tag: "Manager",
    time: "06:00 - 07:00",
    faded: false,
  },
  {
    title: "Sprint Planning",
    tag: "Design",
    time: "06:00 - 07:00",
    faded: true,
  },
];

export function UpcomingMeetingsCard() {
  return (
    <Card className="overflow-hidden">
      <div className="mb-4 flex items-start justify-between">
        <h3 className="text-[15px] font-semibold leading-snug text-gray-900">
          Upcoming
          <br />
          Meetings
        </h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Add meeting"
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="More options"
            className="text-gray-400 hover:text-gray-600"
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      <div className="relative -mx-5 max-h-[300px] overflow-hidden px-5">
        <div className="flex flex-col gap-3">
          {meetings.map((m) => (
            <div
              key={m.title}
              className={cn(
                "rounded-xl bg-gray-50 p-4 transition-opacity",
                m.faded && "opacity-40",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">
                  {m.title}
                </h4>
                <MoreHorizontal className="h-4 w-4 text-gray-400" />
              </div>
              <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-500">
                <Video className="h-3.5 w-3.5 text-emerald-500" />
                On Google Meet
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm">
                  {m.tag}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  {m.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </div>
    </Card>
  );
}

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

export function DealsOverviewCard() {
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

export function SalesPipelineOverviewCard() {
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
