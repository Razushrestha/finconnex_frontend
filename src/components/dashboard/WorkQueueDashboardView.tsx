"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  FileWarning,
  Phone,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import {
  type DashboardFilters,
} from "@/lib/dashboard/layout";
import {
  computeWorkQueueDashboard,
  type QueueLine,
} from "@/lib/dashboard/work-queue-board";
import {
  DashboardViewGrid,
  type DashboardReorderProps,
} from "@/components/dashboard/DashboardWidgetSlot";
import { cn } from "@/lib/utils";

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Clock3;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", tone)}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-[12px] font-semibold text-slate-700">{label}</p>
      </div>
      <p className="mt-2 text-[22px] font-bold text-slate-900">{value}</p>
      <p className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600">
        <TrendingUp className="h-3 w-3" />
        {value} open
      </p>
    </div>
  );
}

function TableCard({
  title,
  href,
  link,
  columns,
  rows,
}: {
  title: string;
  href: string;
  link: string;
  columns: string[];
  rows: QueueLine[];
}) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="shrink-0 text-[13px] font-semibold text-slate-900">{title}</h3>
      <div className="min-h-0 flex-1 overflow-hidden">
      <table className="mt-2 w-full text-left text-[12px]">
        <thead className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          <tr>
            {columns.map((col) => (
              <th key={col} className="py-1.5 pr-2">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="py-2 pr-2 font-medium text-slate-800">{row.title}</td>
              <td className="pr-2 text-slate-600">{row.related}</td>
              <td className="pr-2 text-slate-600">{row.owner}</td>
              <td className="pr-2 text-slate-600">{row.when}</td>
              <td>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    row.tone === "rose" && "bg-rose-50 text-rose-700",
                    row.tone === "amber" && "bg-amber-50 text-amber-700",
                    row.tone === "emerald" && "bg-emerald-50 text-emerald-700",
                    !row.tone && "bg-slate-100 text-slate-600",
                  )}
                >
                  {row.extra}
                </span>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length} className="py-6 text-center text-slate-400">
                Nothing waiting here.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      <Link href={href} className="mt-auto pt-3 text-[11px] font-semibold text-[#5A32A3] hover:underline">
        {link} →
      </Link>
    </section>
  );
}

export function WorkQueueDashboardView({
  filters,
  hiddenWidgets = [],
  widgetOrder,
  reordering = false,
  dragging = null,
  over = null,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onArchive,
}: {
  filters: DashboardFilters;
} & DashboardReorderProps) {
  const data = useMemo(
    () => computeWorkQueueDashboard(filters),
    [filters],
  );

  const items = {
    kpis: {
      span: "full" as const,
      node: (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Overdue Tasks" value={data.overdueTasks} icon={AlertTriangle} tone="bg-rose-50 text-rose-600" />
          <Kpi label="Tasks Due Today" value={data.tasksDueToday} icon={Clock3} tone="bg-orange-50 text-orange-600" />
          <Kpi label="Follow-ups Due" value={data.followUpsDue} icon={Phone} tone="bg-sky-50 text-sky-600" />
          <Kpi label="Documents Pending" value={data.documentsPending} icon={FileWarning} tone="bg-emerald-50 text-emerald-600" />
          <Kpi label="Appointments Today" value={data.appointmentsToday} icon={CalendarDays} tone="bg-violet-50 text-[#5A32A3]" />
          <Kpi label="SLA Breaches" value={data.slaBreaches} icon={ShieldAlert} tone="bg-amber-50 text-amber-600" />
        </div>
      ),
    },
    "tasks-today": {
      node: (
        <TableCard
          title="Tasks Due Today"
          href="/activities/tasks"
          link="View All Tasks"
          columns={["Task", "Related To", "Owner", "Due", "Priority"]}
          rows={data.tasksToday}
        />
      ),
    },
    "follow-ups": {
      node: (
        <TableCard
          title="Follow-ups Due"
          href="/activities/reminders"
          link="View All Follow-ups"
          columns={["Follow-up", "Related To", "Owner", "Due", "Type"]}
          rows={data.followUps}
        />
      ),
    },
    documents: {
      node: (
        <TableCard
          title="Documents Pending"
          href="/documents/requests"
          link="View All Documents"
          columns={["Document", "Requested For", "Owner", "Requested", "Due"]}
          rows={data.documents}
        />
      ),
    },
    appointments: {
      node: (
        <TableCard
          title="Appointments Today"
          href="/activities/meetings"
          link="View Full Calendar"
          columns={["Meeting", "Related To", "Owner", "Time", "Type"]}
          rows={data.appointments}
        />
      ),
    },
    missed: {
      node: (
        <TableCard
          title="Missed Appointments"
          href="/activities/meetings"
          link="View All"
          columns={["Contact", "Related To", "Owner", "When", "Type"]}
          rows={data.missed}
        />
      ),
    },
    stale: {
      node: (
        <TableCard
          title="Stale Deals (No Activity)"
          href="/sales/leads"
          link="View All Stale Deals"
          columns={["Record", "Related To", "Owner", "Last Activity", "Inactive"]}
          rows={data.stale}
        />
      ),
    },
    approvals: {
      node: (
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-[13px] font-semibold text-slate-900">Approvals Pending</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {data.approvals.map((row) => (
              <div key={row.label} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[11px] text-slate-500">{row.label}</p>
                <p className="text-xl font-bold text-slate-900">{row.value}</p>
              </div>
            ))}
          </div>
        </section>
      ),
    },
    lenders: {
      node: (
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-[13px] font-semibold text-slate-900">Lender Pending Actions</h3>
          <div className="mt-3 space-y-2">
            {data.lenders.length ? data.lenders.map((row) => (
              <div key={row.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-[13px]">
                <span className="font-medium text-slate-800">{row.name}</span>
                <span className="font-semibold text-rose-600">{row.value} pending</span>
              </div>
            )) : (
              <p className="py-6 text-center text-[12px] text-slate-400">No lender packs waiting.</p>
            )}
          </div>
        </section>
      ),
    },
    urgent: {
      node: (
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-[13px] font-semibold text-slate-900">Urgent / High Priority</h3>
          <div className="mt-3 space-y-2">
            {data.urgent.length ? data.urgent.map((row) => (
              <div key={row.id} className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-slate-800">{row.title}</p>
                  <p className="text-[11px] text-slate-500">{row.when}</p>
                </div>
              </div>
            )) : (
              <p className="py-6 text-center text-[12px] text-slate-400">No urgent items.</p>
            )}
          </div>
          <Link href="/work-queue" className="mt-auto pt-3 text-[11px] font-semibold text-[#5A32A3] hover:underline">
            View All ({data.slaBreaches}) →
          </Link>
        </section>
      ),
    },
  };

  return (
    <DashboardViewGrid
      items={items}
      widgetOrder={widgetOrder}
      hiddenWidgets={hiddenWidgets}
      reordering={reordering}
      dragging={dragging}
      over={over}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onArchive={onArchive}
    />
  );
}

