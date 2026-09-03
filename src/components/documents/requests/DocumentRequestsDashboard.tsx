"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  FileText,
  Hourglass,
  Plus,
  XCircle,
} from "lucide-react";
import {
  CartesianGrid,
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
import type { DocumentRequest } from "@/lib/documents/requests/types";
import {
  buildKpis,
  buildTeamWorkload,
  buildStatusSlices,
  buildTimeSeries,
  filterDocumentRequests,
  type AttentionFilter,
  type DocumentSortKey,
} from "@/lib/documents/requests/dashboard";
import { DocumentRequestsList } from "@/components/documents/requests/DocumentRequestsList";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

const PREVIEW_ROWS = 5;

function Trend({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="whitespace-nowrap text-slate-400">
        <span className="text-[12px] font-medium">0% —</span>{" "}
        <span className="text-[10px] font-normal">vs last month</span>
      </span>
    );
  }
  const up = value > 0;
  return (
    <span
      className={cn(
        "whitespace-nowrap",
        up ? "text-emerald-600" : "text-rose-500",
      )}
    >
      <span className="text-[12px] font-semibold">
        {Math.abs(value)}% {up ? "↑" : "↓"}
      </span>{" "}
      <span className="text-[10px] font-normal">vs last month</span>
    </span>
  );
}

function KpiCard({
  label,
  value,
  trend,
  icon,
  iconClass,
  active,
  onClick,
}: {
  label: string;
  value: number;
  trend: number;
  icon: ReactNode;
  iconClass: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-white px-4 py-3.5 text-left shadow-sm transition-colors",
        active
          ? "border-[#5A32A3]/40 ring-2 ring-[#5A32A3]/15"
          : "border-slate-200/80 hover:border-[#5A32A3]/25",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-[26px] leading-none font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <div className="mt-1.5">
            <Trend value={trend} />
          </div>
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            iconClass,
          )}
        >
          {icon}
        </span>
      </div>
    </button>
  );
}

export function DocumentRequestsDashboard({
  rows,
  source,
  loading,
  error,
  onRefresh,
}: {
  rows: DocumentRequest[];
  source?: "api" | "demo";
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}) {
  const [attention, setAttention] = useState<AttentionFilter>("all");
  const [chartMode, setChartMode] = useState<"daily" | "weekly">("daily");
  const [hoverStatus, setHoverStatus] = useState<string | null>(null);
  const [tableSort, setTableSort] = useState<DocumentSortKey>("started-desc");

  const kpis = useMemo(() => buildKpis(rows), [rows]);
  const teamWorkload = useMemo(() => buildTeamWorkload(rows), [rows]);
  const statusSlices = useMemo(() => buildStatusSlices(rows), [rows]);
  const timeSeries = useMemo(
    () => buildTimeSeries(rows, chartMode),
    [rows, chartMode],
  );
  const preview = useMemo(
    () =>
      filterDocumentRequests(rows, {
        statusFilter: "All",
        attention,
        sort: tableSort,
      }),
    [rows, attention, tableSort],
  );

  function toggleKpi(next: AttentionFilter) {
    setAttention((prev) => (prev === next ? "all" : next));
  }

  return (
    <div className="min-h-full bg-[#f4f2f7]">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              source === "api"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500",
            )}
          >
            {source === "api"
              ? "Live CRM"
              : loading
                ? "Connecting…"
                : "Demo"}
          </span>
          {error && source === "demo" ? (
            <span className="text-[10px] text-slate-500">{error}</span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Total Requests"
            value={kpis.total}
            trend={kpis.trends.total}
            icon={<FileText className="h-5 w-5" />}
            iconClass="bg-slate-100 text-slate-600"
            active={attention === "all"}
            onClick={() => setAttention("all")}
          />
          <KpiCard
            label="Overdue"
            value={kpis.overdue}
            trend={kpis.trends.overdue}
            icon={<Hourglass className="h-5 w-5" />}
            iconClass="bg-rose-100 text-rose-600"
            active={attention === "pending-overdue"}
            onClick={() => toggleKpi("pending-overdue")}
          />
          <KpiCard
            label="Pending"
            value={kpis.onTime}
            trend={kpis.trends.onTime}
            icon={<Clock3 className="h-5 w-5" />}
            iconClass="bg-indigo-100 text-indigo-600"
            active={attention === "pending-ontime"}
            onClick={() => toggleKpi("pending-ontime")}
          />
          <KpiCard
            label="Review"
            value={kpis.review}
            trend={kpis.trends.review}
            icon={<FileSearch className="h-5 w-5" />}
            iconClass="bg-violet-100 text-violet-700"
            active={attention === "review"}
            onClick={() => toggleKpi("review")}
          />
          <KpiCard
            label="Completed"
            value={kpis.completed}
            trend={kpis.trends.completed}
            icon={<CheckCircle2 className="h-5 w-5" />}
            iconClass="bg-emerald-100 text-emerald-600"
            active={attention === "completed"}
            onClick={() => toggleKpi("completed")}
          />
          <KpiCard
            label="Cancelled / Closed"
            value={kpis.closed}
            trend={kpis.trends.closed}
            icon={<XCircle className="h-5 w-5" />}
            iconClass="bg-slate-100 text-slate-500"
            active={attention === "closed"}
            onClick={() => toggleKpi("closed")}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)_minmax(240px,0.75fr)]">
          <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-[14px] font-semibold text-slate-900">
                Requests Over Time
              </h2>
              <div className="flex rounded-lg border border-slate-200 p-0.5">
                {(["daily", "weekly"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setChartMode(mode)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize",
                      chartMode === mode
                        ? "bg-[#5A32A3] text-white"
                        : "text-slate-500 hover:text-slate-800",
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[168px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries}>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #E2E8F0",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="requested"
                    name="Requested"
                    stroke="#7C3AED"
                    strokeWidth={2.2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#10B981"
                    strokeWidth={2.2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="overdue"
                    name="Overdue"
                    stroke="#F43F5E"
                    strokeWidth={2.2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-[14px] font-semibold text-slate-900">
              Requests by Status
            </h2>
            <div className="grid min-h-0 flex-1 grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
              <div className="relative mx-auto h-[120px] w-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusSlices}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="68%"
                      outerRadius="100%"
                      paddingAngle={3}
                      stroke="none"
                      onMouseLeave={() => setHoverStatus(null)}
                    >
                      {statusSlices.map((s) => (
                        <Cell
                          key={s.key}
                          fill={s.fill}
                          opacity={
                            !hoverStatus || hoverStatus === s.key ? 1 : 0.22
                          }
                          onMouseEnter={() => setHoverStatus(s.key)}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-900">
                    {kpis.total}
                  </span>
                  <span className="text-[10px] text-slate-400">Total</span>
                </div>
              </div>
              <ul className="space-y-1.5">
                {(hoverStatus
                  ? statusSlices.filter((s) => s.key === hoverStatus)
                  : statusSlices
                ).map((s) => (
                  <li
                    key={s.key}
                    className="flex cursor-default items-center justify-between text-[12px]"
                    onMouseEnter={() => setHoverStatus(s.key)}
                    onMouseLeave={() => setHoverStatus(null)}
                  >
                    <span className="flex min-w-0 items-center gap-2 text-slate-600">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: s.fill }}
                      />
                      <span className="truncate">{s.name}</span>
                    </span>
                    <span className="ml-2 shrink-0 text-right font-semibold text-slate-800">
                      {s.pct}%
                      {hoverStatus ? (
                        <span className="mt-0.5 block text-[10px] font-medium text-slate-500">
                          {s.value} {s.value === 1 ? "document" : "documents"}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <h2 className="text-[14px] font-semibold text-slate-900">
              Team workload
            </h2>
            {teamWorkload.length === 0 ? (
              <p className="mt-3 text-[12px] text-slate-400">
                No open requests assigned.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {teamWorkload.map((member) => (
                  <li key={member.name} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                        avatarColor(member.name),
                      )}
                    >
                      {initials(member.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-slate-900">
                        {member.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        <span className="font-semibold text-rose-600">
                          {member.overdue}
                        </span>{" "}
                        overdue · {member.pending} pending
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="min-w-0 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] px-4 py-3">
              <h2 className="flex items-center gap-2 text-[15px] font-bold text-slate-900">
                <FileText className="h-4 w-4 shrink-0 text-[#5A32A3]" />
                Recent Documents
              </h2>
              <div className="flex items-center gap-2">
                <Link
                  href="/documents/requests/all"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  All Requests
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/documents/requests/create?layoutid=standard&redirect=false"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#5A32A3] px-3 text-[12px] font-semibold text-white hover:bg-[#4c2a8a]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Request Document
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <DocumentRequestsList
                data={preview}
                limit={PREVIEW_ROWS}
                framed={false}
                showRelatedTo
                columnChrome={false}
                onRefresh={onRefresh}
                sort={tableSort}
                onSortChange={setTableSort}
              />
            </div>
          </section>
      </div>
    </div>
  );
}
