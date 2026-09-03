"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  ListFilter,
  Phone,
  RotateCcw,
  Trophy,
  Users,
  Wallet,
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
import { formatCurrency } from "@/lib/dashboard/layout";
import { formatCompactMoney } from "@/lib/dashboard/executive";
import { DashboardDateRangePicker } from "@/components/dashboard/DashboardDateRangePicker";
import {
  computeTeamAnalytics,
  defaultTeamAnalyticsFilters,
  exportTeamAnalytics,
  formatDuration,
  rankMembers,
  teamFilterOptions,
  TEAM_RANK_BY,
  type TeamAnalyticsFilters,
  type TeamRankBy,
} from "@/lib/analytics/team";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const TIME_COLORS = ["#5A32A3", "#2563EB", "#0D9488", "#F59E0B", "#DB2777", "#64748B"];
const RANK_LABELS: Record<TeamRankBy, string> = {
  revenue: "Revenue",
  settlements: "Settlements",
  conversion: "Conversion",
  leads: "Leads",
  activities: "Activities",
  tasks: "Task completion",
  sla: "SLA",
  response: "Response time",
  quality: "Quality",
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

function PillSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-800 outline-none hover:bg-slate-50"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
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

export function TeamAnalytics() {
  const [filters, setFilters] = useState<TeamAnalyticsFilters>(defaultTeamAnalyticsFilters);
  const [moreKpis, setMoreKpis] = useState(false);
  const [rankBy, setRankBy] = useState<TeamRankBy>("revenue");
  const [selected, setSelected] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const options = useMemo(() => teamFilterOptions(), []);
  const data = useMemo(() => computeTeamAnalytics(filters), [filters]);
  const ranked = useMemo(() => rankMembers(data.memberRows, rankBy), [data.memberRows, rankBy]);
  const profile = data.memberRows.find((row) => row.owner === selected) ?? null;
  const kpis = moreKpis ? [...data.primaryKpis, ...data.extraKpis] : data.primaryKpis;

  function patch(next: Partial<TeamAnalyticsFilters>) {
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
            <h1 className="text-[22px] font-semibold text-slate-900">Team Analytics</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Track team performance, productivity and results. Drive better outcomes with data.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <DashboardDateRangePicker
              variant="standalone"
              filters={filters}
              onChange={(next) => patch(next)}
            />
            <PillSelect
              value={filters.team}
              onChange={(team) => patch({ team: team as TeamAnalyticsFilters["team"] })}
              options={options.teams.map((team) => ({ value: team, label: team === "All teams" ? "All Teams" : team }))}
            />
            <PillSelect
              value={filters.user}
              onChange={(user) => patch({ user })}
              options={options.users.map((user) => ({ value: user, label: user === "All" ? "All Users" : user }))}
            />
            <PillSelect
              value={filters.loanType}
              onChange={(loanType) => patch({ loanType: loanType as TeamAnalyticsFilters["loanType"] })}
              options={options.loanTypes.map((item) => ({ value: item, label: item }))}
            />
            <PillSelect
              value={filters.source}
              onChange={(source) => patch({ source })}
              options={options.sources.map((source) => ({ value: source, label: source === "All" ? "All Sources" : source }))}
            />
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
                <label className="mt-2 block text-[11px] font-medium text-slate-500">
                  Activity Type
                  <select value={filters.activityType} onChange={(e) => patch({ activityType: e.target.value })} className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-[12px]">
                    {options.activityTypes.map((item) => <option key={item} value={item}>{item === "All" ? "All Activity Types" : item}</option>)}
                  </select>
                </label>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={() => setFilters(defaultTeamAnalyticsFilters())}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
            <button
              type="button"
              onClick={() => exportTeamAnalytics(data, filters)}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-[#5A32A3] px-2.5 text-[11px] font-semibold text-white hover:bg-[#4a2788]"
            >
              <Download className="h-3 w-3" />
              Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <div key={kpi.id} className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-[12px] font-semibold text-slate-600">{kpi.label}</p>
              <p className="mt-2 text-[22px] font-bold text-slate-900">{kpi.value}</p>
              <div className="mt-1"><Delta value={kpi.delta} invert={kpi.invert} /></div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setMoreKpis((v) => !v)} className="self-start text-[12px] font-semibold text-[#5A32A3]">
          {moreKpis ? "Show fewer KPIs" : "View more KPIs"}
        </button>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Card title="Team Performance">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.weekly}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="activities" name="Activities" stroke="#5A32A3" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="tasks" name="Tasks" stroke="#2563EB" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="leads" name="Leads" stroke="#0D9488" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card
            title="Member Performance"
            action={
              <select value={rankBy} onChange={(e) => setRankBy(e.target.value as TeamRankBy)} className="rounded-md border border-slate-200 px-2 py-1 text-[11px]">
                {TEAM_RANK_BY.map((id) => <option key={id} value={id}>Rank by {RANK_LABELS[id]}</option>)}
              </select>
            }
          >
            <ul className="space-y-2">
              {ranked.map((row, i) => (
                <li key={row.owner}>
                  <button type="button" onClick={() => setSelected(row.owner)} className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left hover:bg-slate-50">
                    <span className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-800">
                      <span className="w-5 text-[11px] font-bold text-slate-400">{i + 1}</span>
                      {row.owner}
                    </span>
                    <span className="text-[12px] font-semibold text-slate-700">
                      {rankBy === "revenue" ? formatCompactMoney(row.revenue) : rankBy === "response" ? formatDuration(row.response) : rankBy === "sla" || rankBy === "conversion" || rankBy === "tasks" || rankBy === "quality" ? `${row[rankBy === "tasks" ? "completion" : rankBy]}%` : row[rankBy === "settlements" ? "settled" : rankBy === "activities" ? "activities" : "leads"]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Card title="Productivity Overview">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.productivity}>
                  <XAxis dataKey="type" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="completed" name="Completed" fill="#2563EB" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="overdue" name="Overdue" fill="#F97316" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="mt-3 w-full text-left text-[12px]">
              <thead className="text-[10px] tracking-wide text-slate-400 uppercase">
                <tr><th className="py-1">Type</th><th>Planned</th><th>Completed</th><th>Completion</th></tr>
              </thead>
              <tbody>
                {data.productivity.map((row) => (
                  <tr key={row.type} className="border-t border-slate-100">
                    <td className="py-1.5 font-medium">{row.type}</td>
                    <td>{row.planned}</td>
                    <td>{row.completed}</td>
                    <td className="font-semibold">{row.completion}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Time Analytics">
            <table className="w-full text-left text-[12px]">
              <thead className="text-[10px] tracking-wide text-slate-400 uppercase">
                <tr>
                  <th className="pb-2">Member</th>
                  <th>Average</th>
                  <th>Median</th>
                  <th>Fastest</th>
                  <th>Slowest</th>
                  <th>SLA</th>
                </tr>
              </thead>
              <tbody>
                {data.memberRows.map((row) => (
                  <tr key={row.owner} className="border-t border-slate-100">
                    <td className="py-2 font-medium">
                      <button type="button" onClick={() => setSelected(row.owner)} className="hover:text-[#5A32A3]">{row.owner}</button>
                    </td>
                    <td>{formatDuration(row.avgTime)}</td>
                    <td>{formatDuration(row.medianTime)}</td>
                    <td>{formatDuration(row.fastest)}</td>
                    <td>{formatDuration(row.slowest)}</td>
                    <td className={cn("font-semibold", row.sla >= 90 ? "text-emerald-600" : "text-rose-600")}>{row.sla}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Card title="Task Performance">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="text-[10px] tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="pb-2">Member</th><th>Assigned</th><th>Completed</th><th>Pending</th><th>Overdue</th><th>Completion</th><th>Avg Time</th><th>SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {data.memberRows.map((row) => (
                    <tr key={row.owner} className="border-t border-slate-100">
                      <td className="py-2 font-medium">
                        <button type="button" onClick={() => setSelected(row.owner)} className="hover:text-[#5A32A3]">{row.owner}</button>
                      </td>
                      <td>{row.assigned}</td>
                      <td>{row.completed}</td>
                      <td>{row.pending}</td>
                      <td>{row.overdue}</td>
                      <td className="font-semibold">{row.completion}%</td>
                      <td>{formatDuration(row.avgTime)}</td>
                      <td>{row.sla}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="SLA Performance">
            <div className="flex items-center gap-4">
              <div className="relative h-32 w-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ name: "met", value: data.slaCompliance }, { name: "rest", value: Math.max(0, 100 - data.slaCompliance) }]} dataKey="value" innerRadius={38} outerRadius={52} startAngle={90} endAngle={-270}>
                      <Cell fill="#16A34A" />
                      <Cell fill="#E2E8F0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[16px] font-bold">{data.slaCompliance}%</div>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-2 text-[12px]">
                <p>SLA met <span className="font-semibold">{data.slaMet}</span></p>
                <p>SLA breached <span className="font-semibold text-rose-600">{data.slaBreached}</span></p>
                <p>Avg delay <span className="font-semibold">{formatDuration(data.slaDelay)}</span></p>
                <p>Critical <span className="font-semibold">{data.criticalBreaches}</span></p>
              </div>
            </div>
            <table className="mt-3 w-full text-left text-[12px]">
              <thead className="text-[10px] tracking-wide text-slate-400 uppercase"><tr><th className="py-1">Metric</th><th>Target</th><th>Actual</th><th></th></tr></thead>
              <tbody>
                {data.slaRows.map((row) => (
                  <tr key={row.label} className="border-t border-slate-100">
                    <td className="py-1.5">{row.label}</td>
                    <td>{row.target}</td>
                    <td className="font-semibold">{row.actual}</td>
                    <td>{row.ok ? "✅" : "🔴"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Card title="Response Time">
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[11px] text-slate-500">Average first response</p>
                <p className="text-xl font-bold">{formatDuration(data.avgResponse)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[11px] text-slate-500">Median first response</p>
                <p className="text-xl font-bold">{formatDuration(data.medianResponse)}</p>
              </div>
            </div>
            <div className="space-y-2">
              {data.responseBuckets.map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between text-[11px]"><span>{row.label}</span><span className="font-semibold">{row.value}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#5A32A3]" style={{ width: `${row.value}%` }} /></div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Workload">
            <div className="space-y-3">
              {data.memberRows.map((row) => (
                <div key={row.owner}>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <button type="button" onClick={() => setSelected(row.owner)} className="font-medium hover:text-[#5A32A3]">{row.owner}</button>
                    <span className="font-semibold">{row.workload}% · {row.loadLabel}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn("h-full rounded-full", row.workload >= 90 ? "bg-rose-500" : row.workload >= 75 ? "bg-orange-400" : "bg-[#5A32A3]")} style={{ width: `${row.workload}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Card title="Pipeline Performance">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="text-[10px] tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="pb-2">Member</th><th>Leads</th><th>Handled</th><th>Appt</th><th>App</th><th>Submitted</th><th>Approved</th><th>Settled</th>
                  </tr>
                </thead>
                <tbody>
                  {data.memberRows.map((row) => (
                    <tr key={row.owner} className="border-t border-slate-100">
                      <td className="py-2 font-medium">{row.owner}</td>
                      <td>{row.leads}</td><td>{row.handled}</td><td>{row.appointment}</td><td>{row.application}</td><td>{row.submitted}</td><td>{row.approved}</td><td>{row.settled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Stage Speed">
            <div className="space-y-2">
              {data.stageSpeed.map((row) => (
                <div key={row.stage} className="flex items-center justify-between text-[12px]">
                  <span className="text-slate-600">{row.stage}</span>
                  <span className="font-semibold">{row.avgLabel}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Card title="Follow-up">
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Due", data.followUps.due],
                ["Completed", data.followUps.completed],
                ["Missed", data.followUps.missed],
                ["Overdue", data.followUps.overdue],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[11px] text-slate-500">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-slate-600">
              Completion {data.followUps.completion}% · Contact {data.followUps.contact}% · Rebook {data.followUps.rebook}%
            </p>
          </Card>
          <Card title="Communication">
            <div className="grid grid-cols-3 gap-2 text-[12px]">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="inline-flex items-center gap-1 font-semibold"><Phone className="h-3.5 w-3.5" /> Calls</p>
                <p className="mt-2">Total {data.comms.calls.total}</p>
                <p>Answered {data.comms.calls.answered}</p>
                <p>Missed {data.comms.calls.missed}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="font-semibold">Emails</p>
                <p className="mt-2">Sent {data.comms.emails.sent}</p>
                <p>Opened {data.comms.emails.opened}</p>
                <p>Bounce {data.comms.emails.bounce}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="font-semibold">Meetings</p>
                <p className="mt-2">Booked {data.comms.meetings.booked}</p>
                <p>Completed {data.comms.meetings.completed}</p>
                <p>Cancelled {data.comms.meetings.cancelled}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card title="Time Spent by Activity">
            <div className="flex items-center gap-3">
              <div className="relative h-36 w-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.timeByType} dataKey="minutes" nameKey="name" innerRadius={40} outerRadius={56}>
                      {data.timeByType.map((row, i) => <Cell key={row.name} fill={TIME_COLORS[i % TIME_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[11px] text-slate-500">Total</p>
                  <p className="text-[13px] font-bold">{data.totalTimeLabel}</p>
                </div>
              </div>
              <ul className="flex-1 space-y-1 text-[11px]">
                {data.timeByType.map((row, i) => (
                  <li key={row.name} className="flex justify-between">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: TIME_COLORS[i] }} />{row.name}</span>
                    <span className="font-semibold">{row.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          <Card title="Top Performers" action={<Trophy className="h-4 w-4 text-[#5A32A3]" />}>
            <ol className="space-y-2">
              {ranked.slice(0, 5).map((row, i) => (
                <li key={row.owner} className="flex items-center justify-between text-[13px]">
                  <span className="font-medium">{i + 1}. {row.owner}</span>
                  <span className="text-slate-500">{row.score}/100</span>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="Needs Attention">
            {data.needsAttention.length ? data.needsAttention.map((row) => (
              <div key={row.owner} className="mb-2 rounded-xl bg-rose-50 px-3 py-2">
                <p className="inline-flex items-center gap-1 text-[12px] font-semibold text-rose-700">
                  <AlertTriangle className="h-3.5 w-3.5" /> {row.owner}
                </p>
                <ul className="mt-1 text-[11px] text-rose-800">
                  {row.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
                <button type="button" onClick={() => setSelected(row.owner)} className="mt-1 text-[11px] font-semibold text-[#5A32A3]">View performance</button>
              </div>
            )) : <p className="text-[12px] text-slate-400">No attention items in this range.</p>}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card title="Revenue" className="xl:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="text-[10px] tracking-wide text-slate-400 uppercase">
                  <tr><th className="pb-2">Member</th><th>Settled</th><th>Loan value</th><th>Revenue</th><th>Target</th><th>Achievement</th></tr>
                </thead>
                <tbody>
                  {data.memberRows.map((row) => (
                    <tr key={row.owner} className="border-t border-slate-100">
                      <td className="py-2 font-medium">{row.owner}</td>
                      <td>{row.settled}</td>
                      <td>{formatCompactMoney(row.loanValue)}</td>
                      <td>{formatCurrency(row.revenue)}</td>
                      <td>{formatCurrency(row.target)}</td>
                      <td className={cn("font-semibold", row.achievement >= 100 ? "text-emerald-600" : "text-slate-700")}>{row.achievement}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Target vs Actual">
            <div className="space-y-2 text-[12px]">
              <p>Revenue / employee <span className="font-semibold">{formatCurrency(data.efficiency.revenuePerEmployee)}</span></p>
              <p>Revenue / lead <span className="font-semibold">{formatCurrency(data.efficiency.revenuePerLead)}</span></p>
              <p>Settlements / employee <span className="font-semibold">{data.efficiency.settlementsPerEmployee}</span></p>
              <p>Tasks / working hour <span className="font-semibold">{data.efficiency.tasksPerHour}</span></p>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Card title="Quality">
            <p className="text-[28px] font-bold text-slate-900">{data.qualityScore}<span className="text-[14px] font-semibold text-slate-400">/100</span></p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
              <p>Reopened <span className="font-semibold">{data.quality.reopened}</span></p>
              <p>Rejected <span className="font-semibold">{data.quality.rejected}</span></p>
              <p>Errors <span className="font-semibold">{data.quality.errors}</span></p>
            </div>
            <ul className="mt-3 space-y-1 text-[12px]">
              {data.memberRows.map((row) => (
                <li key={row.owner} className="flex justify-between"><span>{row.owner}</span><span className="font-semibold">{row.quality}%</span></li>
              ))}
            </ul>
          </Card>
          <Card title="Activity Heatmap">
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
                    {row.cells.map((value, i) => (
                      <td key={`${row.hour}-${i}`} className="p-0.5">
                        <span className="mx-auto block h-5 w-full rounded-sm" style={{ backgroundColor: value ? `rgba(90,50,163,${Math.min(1, 0.2 + value / 6)})` : "#EEF2F7" }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <Card title="Trends & Insights">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {data.trends.map((row) => (
              <div key={row.label} className="rounded-xl bg-slate-50 px-3 py-3">
                <p className="text-[11px] text-slate-500">{row.label}</p>
                <p className="mt-1 text-[20px] font-bold">{row.value}</p>
                <Delta value={row.delta} invert={row.invert} />
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            ["Total Leads", data.totals.leads, Users],
            ["Total Deals", data.totals.deals, Zap],
            ["Total Settlements", data.totals.settlements, Trophy],
            ["Conversion Rate", `${data.totals.conversion}%`, Wallet],
          ].map(([label, value, Icon]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-600">
                <Icon className="h-3.5 w-3.5 text-[#5A32A3]" /> {label}
              </p>
              <p className="mt-2 text-[22px] font-bold">{value}</p>
            </div>
          ))}
        </div>

        {profile ? (
          <Card title={`${profile.owner} — performance profile`} action={<button type="button" onClick={() => setSelected(null)} className="text-[11px] font-semibold text-slate-500">Close</button>}>
            <div className="grid grid-cols-2 gap-3 text-[12px] md:grid-cols-4">
              <p>Score <span className="font-semibold">{profile.score}/100</span></p>
              <p>Revenue <span className="font-semibold">{formatCurrency(profile.revenue)}</span></p>
              <p>Settlements <span className="font-semibold">{profile.settled}</span></p>
              <p>Conversion <span className="font-semibold">{profile.conversion}%</span></p>
              <p>Tasks completed <span className="font-semibold">{profile.completed}</span></p>
              <p>Avg task time <span className="font-semibold">{formatDuration(profile.avgTime)}</span></p>
              <p>Median time <span className="font-semibold">{formatDuration(profile.medianTime)}</span></p>
              <p>SLA <span className="font-semibold">{profile.sla}%</span></p>
              <p>Active leads <span className="font-semibold">{profile.openLeads}</span></p>
              <p>Active deals <span className="font-semibold">{profile.openDeals}</span></p>
              <p>Overdue <span className="font-semibold">{profile.overdue}</span></p>
              <p>Target <span className="font-semibold">{profile.achievement}%</span></p>
            </div>
          </Card>
        ) : null}

        <p className="text-[11px] text-slate-400">
          Task time uses created → completed timestamps from live CRM records. Business-hours and start/pause tracking are not stored on every task yet, so averages use resolution time.
        </p>
      </div>
    </div>
  );
}
