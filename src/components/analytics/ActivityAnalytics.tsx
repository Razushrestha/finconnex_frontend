"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  ListFilter,
  Mail,
  Phone,
  RotateCcw,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardDateRangePicker } from "@/components/dashboard/DashboardDateRangePicker";
import {
  activityFilterOptions,
  computeActivityAnalytics,
  defaultActivityAnalyticsFilters,
  exportActivityAnalytics,
  type ActivityAnalyticsFilters,
} from "@/lib/analytics/activity";
import { formatDuration } from "@/lib/analytics/team";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const KIND_TONE: Record<string, string> = {
  Call: "bg-sky-50 text-sky-700",
  Email: "bg-violet-50 text-[#5A32A3]",
  Meeting: "bg-emerald-50 text-emerald-700",
  Task: "bg-amber-50 text-amber-700",
  "Follow-up": "bg-orange-50 text-orange-700",
};

function Card({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function PillSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-800 outline-none hover:bg-slate-50"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

function Delta({ value, invert }: { value: number; invert?: boolean }) {
  const up = invert ? value < 0 : value > 0;
  return (
    <span className={cn("text-[11px] font-semibold", up ? "text-emerald-600" : value === 0 ? "text-slate-400" : "text-rose-500")}>
      {value > 0 ? "↑" : value < 0 ? "↓" : "→"} {Math.abs(value)}%
    </span>
  );
}

export function ActivityAnalytics() {
  const [filters, setFilters] = useState<ActivityAnalyticsFilters>(defaultActivityAnalyticsFilters);
  const [selected, setSelected] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const options = useMemo(() => activityFilterOptions(), []);
  const data = useMemo(() => computeActivityAnalytics(filters), [filters]);
  const profile = data.memberRows.find((row) => row.owner === selected) ?? null;
  const responseSlices = [
    { name: "0–5m", value: data.response.within5 },
    { name: "5–15m", value: Math.max(0, data.response.within15 - data.response.within5) },
    { name: "15–30m", value: Math.max(0, data.response.within30 - data.response.within15) },
    { name: "30–60m", value: Math.max(0, data.response.within60 - data.response.within30) },
    { name: ">1h", value: Math.max(0, 100 - data.response.within60) },
  ];
  const colors = ["#5A32A3", "#7C4CC4", "#2563EB", "#0D9488", "#94A3B8"];

  function patch(next: Partial<ActivityAnalyticsFilters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  return (
    <div className="min-h-full bg-[#F4F6F9]">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-4 p-4 lg:px-6 2xl:px-8 2xl:py-5">
        <Link href="/analytics" className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Analytics
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="inline-flex items-center gap-2 text-[22px] font-semibold text-slate-900">
              <Zap className="h-5 w-5 text-[#5A32A3]" />
              Activity Analytics
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              First response, duration, conversion and the live activity timeline — from lead created to settlement.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <DashboardDateRangePicker variant="standalone" filters={filters} onChange={patch} />
            <PillSelect value={filters.team} onChange={(team) => patch({ team: team as ActivityAnalyticsFilters["team"] })} options={options.teams.map((team) => ({ value: team, label: team === "All teams" ? "All Teams" : team }))} />
            <PillSelect value={filters.user} onChange={(user) => patch({ user })} options={options.users.map((user) => ({ value: user, label: user === "All" ? "All Users" : user }))} />
            <PillSelect value={filters.source} onChange={(source) => patch({ source })} options={options.sources.map((source) => ({ value: source, label: source === "All" ? "All Sources" : source }))} />
            <DropdownMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 outline-none hover:bg-slate-50">
                <ListFilter className="h-3 w-3" />
                Filters
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52 p-2">
                <label className="block text-[11px] font-medium text-slate-500">
                  Pipeline
                  <select value={filters.pipeline} onChange={(e) => patch({ pipeline: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-[12px]">
                    {options.pipelines.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </DropdownMenuContent>
            </DropdownMenu>
            <button type="button" onClick={() => setFilters(defaultActivityAnalyticsFilters())} className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
            <button type="button" onClick={() => exportActivityAnalytics(data)} className="inline-flex h-8 items-center gap-1 rounded-full bg-[#5A32A3] px-2.5 text-[11px] font-semibold text-white hover:bg-[#4a2788]">
              <Download className="h-3 w-3" /> Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {data.kpis.map((kpi) => (
            <div key={kpi.id} className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-[12px] font-semibold text-slate-600">{kpi.label}</p>
              <p className="mt-2 text-[22px] font-bold text-slate-900">{kpi.value}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <Delta value={kpi.delta} invert={kpi.invert} />
                {kpi.hint ? <span className="truncate text-[10px] text-slate-400">{kpi.hint}</span> : null}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          <Card title="First Response Time" className="xl:col-span-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={responseSlices} dataKey="value" nameKey="name" innerRadius={44} outerRadius={62}>
                      {responseSlices.map((slice, i) => <Cell key={slice.name} fill={colors[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[16px] font-bold">{data.response.within30}%</p>
                  <p className="text-[10px] text-slate-500">within 30 min</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <p>Average <span className="font-semibold">{formatDuration(data.response.avg)}</span></p>
                <p>Median <span className="font-semibold">{formatDuration(data.response.median)}</span></p>
                <p>Fastest <span className="font-semibold">{formatDuration(data.response.fastest)}</span></p>
                <p>Slowest <span className="font-semibold">{formatDuration(data.response.slowest)}</span></p>
                <p>≤5m <span className="font-semibold">{data.response.within5}%</span></p>
                <p>≤15m <span className="font-semibold">{data.response.within15}%</span></p>
                <p>≤1h <span className="font-semibold">{data.response.within60}%</span></p>
                <p>≤24h <span className="font-semibold">{data.response.within1440}%</span></p>
              </div>
            </div>
          </Card>
          <Card title="Response Trend">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.daily}>
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip formatter={(value) => formatDuration(Number(value))} />
                  <Line type="monotone" dataKey="response" name="First response (min)" stroke="#5A32A3" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="SLA">
            <table className="w-full text-left text-[12px]">
              <thead className="text-[10px] tracking-wide text-slate-400 uppercase"><tr><th className="pb-1">Metric</th><th>Target</th><th>Actual</th></tr></thead>
              <tbody>
                {data.slaRows.map((row) => (
                  <tr key={row.label} className="border-t border-slate-100">
                    <td className="py-1.5">{row.label}</td>
                    <td>{row.target}</td>
                    <td className="font-semibold">{row.ok ? "🟢" : "🔴"} {row.actual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-slate-500">Met {data.slaMet} · Breached {data.slaBreached}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card title="Call Duration">
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <p>Total <span className="font-semibold">{data.calls.total}</span></p>
              <p>Connected <span className="font-semibold">{data.calls.connected}</span></p>
              <p>Outbound <span className="font-semibold">{data.calls.outbound}</span></p>
              <p>Inbound <span className="font-semibold">{data.calls.inbound}</span></p>
              <p>Missed <span className="font-semibold">{data.calls.missed}</span></p>
              <p>No answer <span className="font-semibold">{data.calls.noAnswer}</span></p>
              <p>Avg <span className="font-semibold">{formatDuration(data.calls.avg)}</span></p>
              <p>Median <span className="font-semibold">{formatDuration(data.calls.median)}</span></p>
              <p>Talk time <span className="font-semibold">{formatDuration(data.calls.talk)}</span></p>
              <p>Longest <span className="font-semibold">{formatDuration(data.calls.longest)}</span></p>
              <p className="col-span-2">Time to first call <span className="font-semibold">{formatDuration(data.calls.firstCall)}</span></p>
            </div>
          </Card>
          <Card title="Meetings">
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <p>Held <span className="font-semibold">{data.meetings.held}</span></p>
              <p>Avg <span className="font-semibold">{formatDuration(data.meetings.avg)}</span></p>
              <p>Total hours <span className="font-semibold">{formatDuration(data.meetings.total)}</span></p>
              <p>No-show <span className="font-semibold">{data.meetings.noShow}</span></p>
              <p>Cancelled <span className="font-semibold">{data.meetings.cancelled}</span></p>
              <p>Rescheduled <span className="font-semibold">{data.meetings.rescheduled}</span></p>
            </div>
          </Card>
          <Card title="Task Completion Time">
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.tasks.buckets}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="value" name="%" fill="#5A32A3" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[12px] text-slate-600">
              Avg {formatDuration(data.tasks.avg)} · Median {formatDuration(data.tasks.median)} · On time {data.tasks.onTime}%
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card title="Activity Trend">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.daily}>
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="calls" name="Calls" stroke="#2563EB" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="emails" name="Emails" stroke="#5A32A3" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="tasks" name="Tasks" stroke="#F59E0B" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="meetings" name="Meetings" stroke="#0D9488" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Activities by Pipeline Stage">
            <table className="w-full text-left text-[11px]">
              <thead className="text-[10px] tracking-wide text-slate-400 uppercase"><tr><th className="pb-1">Stage</th><th>Calls</th><th>Emails</th><th>Tasks</th><th>/Deal</th></tr></thead>
              <tbody>
                {data.stageRows.map((row) => (
                  <tr key={row.stage} className="border-t border-slate-100">
                    <td className="py-1.5">{row.stage}</td>
                    <td>{row.calls}</td>
                    <td>{row.emails}</td>
                    <td>{row.tasks}</td>
                    <td className="font-semibold">{row.perDeal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Activity → Outcome">
            <ul className="space-y-1.5 text-[12px]">
              {data.conversions.map((row) => (
                <li key={`${row.from}-${row.to}`} className="flex justify-between">
                  <span className="text-slate-600">{row.from} → {row.to}</span>
                  <span className="font-semibold">{row.value}%</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-slate-500">
              {data.quality.activitiesPerSettlement || "—"} activities per settlement · {data.quality.callsPerAppt} calls per appointment
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Card title="Team Performance">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="text-[10px] tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="pb-2">Member</th><th>Activities</th><th>Calls</th><th>Response</th><th>Avg complete</th><th>Wait</th><th>On time</th><th>SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {data.memberRows.map((row) => (
                    <tr key={row.owner} className="border-t border-slate-100">
                      <td className="py-2 font-medium">
                        <button type="button" onClick={() => setSelected(row.owner)} className="hover:text-[#5A32A3]">{row.owner}</button>
                      </td>
                      <td>{row.activities}</td>
                      <td>{row.calls}</td>
                      <td>{formatDuration(row.response)}</td>
                      <td>{formatDuration(row.avgCompletion)}</td>
                      <td>{formatDuration(row.avgWaiting)}</td>
                      <td>{row.onTime}%</td>
                      <td className={cn("font-semibold", row.sla >= 90 ? "text-emerald-600" : "text-rose-600")}>{row.sla}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Workload & Capacity">
            <table className="w-full text-left text-[12px]">
              <thead className="text-[10px] tracking-wide text-slate-400 uppercase"><tr><th className="pb-2">Member</th><th>Open</th><th>Due today</th><th>Overdue</th><th>Hours</th><th>Utilisation</th></tr></thead>
              <tbody>
                {data.memberRows.map((row) => (
                  <tr key={row.owner} className="border-t border-slate-100">
                    <td className="py-2 font-medium">{row.owner}</td>
                    <td>{row.open}</td>
                    <td>{row.dueToday}</td>
                    <td>{row.overdue}</td>
                    <td>{row.workloadHrs}h</td>
                    <td>
                      <span className={cn("font-semibold", row.utilisation >= 90 ? "text-rose-600" : "text-emerald-600")}>{row.utilisation}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card title="Activity by Lead Source">
            <table className="w-full text-left text-[11px]">
              <thead className="text-[10px] tracking-wide text-slate-400 uppercase"><tr><th className="pb-1">Source</th><th>Acts</th><th>Response</th><th>Settle</th><th>/Lead</th></tr></thead>
              <tbody>
                {data.sources.map((row) => (
                  <tr key={row.source} className="border-t border-slate-100">
                    <td className="py-1.5">{row.source}</td>
                    <td>{row.activities}</td>
                    <td>{formatDuration(row.response)}</td>
                    <td>{row.settlements}</td>
                    <td className="font-semibold">{row.perLead}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Follow-up Effectiveness">
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <p>Due <span className="font-semibold">{data.follow.due}</span></p>
              <p>Completed <span className="font-semibold">{data.follow.completed}</span></p>
              <p>Overdue <span className="font-semibold">{data.follow.overdue}</span></p>
              <p>Missed <span className="font-semibold">{data.follow.missed}</span></p>
              <p>Completion <span className="font-semibold">{data.follow.completion}%</span></p>
              <p>→ Appointment <span className="font-semibold">{data.follow.toAppt}%</span></p>
              <p>→ Settlement <span className="font-semibold">{data.follow.toSettle}%</span></p>
              <p>Attempts / appt <span className="font-semibold">{data.follow.attemptsAppt}</span></p>
            </div>
          </Card>
          <Card title="Communication">
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <p className="inline-flex items-center gap-1 font-semibold"><Mail className="h-3.5 w-3.5" /> Email</p>
                <p className="mt-1">Sent {data.emails.sent}</p>
                <p>Delivered {data.emails.delivered}</p>
                <p>Opened {data.emails.opened}</p>
                <p>Bounced {data.emails.bounced}</p>
              </div>
              <div>
                <p className="inline-flex items-center gap-1 font-semibold"><Phone className="h-3.5 w-3.5" /> Calls</p>
                <p className="mt-1">Contact rate {data.kpis.find((k) => k.id === "contact")?.value}</p>
                <p>Client-facing {data.clientFacing}</p>
                <p>Internal {data.internal}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Card title="Best Time to Contact" action={data.bestSlot?.attempts ? <span className="text-[11px] font-semibold text-[#5A32A3]">{data.bestSlot.day} {data.bestSlot.hour} · {data.bestSlot.rate}%</span> : null}>
            <table className="w-full text-center text-[10px]">
              <thead>
                <tr>
                  <th />
                  {data.days.map((day) => <th key={day} className="pb-1 font-semibold text-slate-400">{day}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.heatmap.map((row) => (
                  <tr key={row.hour}>
                    <td className="pr-2 text-left text-slate-400">{row.hour}</td>
                    {row.cells.map((cell, i) => (
                      <td key={`${row.hour}-${i}`} className="p-0.5">
                        <span
                          title={`${cell.rate}% of ${cell.attempts}`}
                          className="mx-auto block h-5 w-full rounded-sm"
                          style={{ backgroundColor: cell.attempts ? `rgba(90,50,163,${Math.min(1, 0.15 + cell.rate / 80)})` : "#EEF2F7" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Day-of-Week Performance">
            <table className="w-full text-left text-[12px]">
              <thead className="text-[10px] tracking-wide text-slate-400 uppercase"><tr><th className="pb-1">Day</th><th>Activities</th><th>Contact</th><th>Appt</th><th>Response</th></tr></thead>
              <tbody>
                {data.weekday.map((row) => (
                  <tr key={row.day} className="border-t border-slate-100">
                    <td className="py-1.5 font-medium">{row.day}</td>
                    <td>{row.activities}</td>
                    <td>{row.contact}%</td>
                    <td>{row.appointments}%</td>
                    <td>{formatDuration(row.response)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            ["Overdue tasks", data.ops.overdue],
            ["Missed follow-ups", data.ops.missedFollow],
            ["Unassigned", data.ops.unassigned],
            ["SLA breaches", data.ops.breaches],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-[12px] font-semibold text-slate-600">{label}</p>
              <p className="mt-2 text-[22px] font-bold">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card title="Stage Speed">
            <ul className="space-y-1.5 text-[12px]">
              {data.stages.map((row) => (
                <li key={row.label} className="flex justify-between">
                  <span className="text-slate-600">{row.label}</span>
                  <span className="font-semibold">{row.value}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Insights">
            <ul className="space-y-2 text-[12px] text-slate-600">
              {data.insights.map((line) => <li key={line}>• {line}</li>)}
            </ul>
          </Card>
          <Card title="Quality & Efficiency">
            <div className="space-y-1.5 text-[12px]">
              <p>Calls / appointment <span className="font-semibold">{data.quality.callsPerAppt}</span></p>
              <p>Calls / settlement <span className="font-semibold">{data.quality.callsPerSettlement || "—"}</span></p>
              <p>Meetings / application <span className="font-semibold">{data.quality.meetingsPerApp || "—"}</span></p>
              <p>Activities / opportunity <span className="font-semibold">{data.quality.activitiesPerOpportunity || "—"}</span></p>
              <p>Activities / settlement <span className="font-semibold">{data.quality.activitiesPerSettlement || "—"}</span></p>
            </div>
          </Card>
        </div>

        <Card title="Activity Timeline" action={<span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><CalendarDays className="h-3.5 w-3.5" /> Live feed</span>}>
          <ol className="space-y-0">
            {data.feed.length ? data.feed.map((row, i) => (
              <li key={row.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={cn("mt-0.5 h-2.5 w-2.5 rounded-full", i === 0 ? "bg-[#5A32A3]" : "bg-slate-300")} />
                  {i < data.feed.length - 1 ? <span className="w-px flex-1 bg-slate-200" /> : null}
                </div>
                <div className="min-w-0 flex-1 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", KIND_TONE[row.kind] ?? "bg-slate-100 text-slate-600")}>{row.kind}</span>
                    <p className="truncate text-[13px] font-semibold text-slate-800">{row.title}</p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {row.owner} · {row.related} · {row.when} · {row.status}
                  </p>
                </div>
              </li>
            )) : (
              <p className="text-[12px] text-slate-400">No activities in this range.</p>
            )}
          </ol>
        </Card>

        {profile ? (
          <Card title={`${profile.owner} — activity performance`} action={<button type="button" onClick={() => setSelected(null)} className="text-[11px] font-semibold text-slate-500">Close</button>}>
            <div className="grid grid-cols-2 gap-3 text-[12px] md:grid-cols-4">
              <p>Activities <span className="font-semibold">{profile.activities}</span></p>
              <p>Calls <span className="font-semibold">{profile.calls}</span></p>
              <p>First response <span className="font-semibold">{formatDuration(profile.response)}</span></p>
              <p>Contact rate <span className="font-semibold">{profile.contact}%</span></p>
              <p>Avg completion <span className="font-semibold">{formatDuration(profile.avgCompletion)}</span></p>
              <p>On time <span className="font-semibold">{profile.onTime}%</span></p>
              <p>Open tasks <span className="font-semibold">{profile.open}</span></p>
              <p>Overdue <span className="font-semibold">{profile.overdue}</span></p>
              <p>Appointments <span className="font-semibold">{profile.appointments}</span></p>
              <p>Settlements <span className="font-semibold">{profile.settlements}</span></p>
              <p>Utilisation <span className="font-semibold">{profile.utilisation}%</span></p>
              <p>Score <span className="font-semibold">{profile.score}/100</span></p>
            </div>
          </Card>
        ) : null}

        <p className="text-[11px] text-slate-400">
          First response is the first call, email, meeting or follow-up after the lead is created. Task start/pause stamps are not stored on every record, so completion uses created → completed time.
        </p>
      </div>
    </div>
  );
}
