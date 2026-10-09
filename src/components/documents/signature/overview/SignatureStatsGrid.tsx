"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  PenLine,
  Clock,
  CheckCircle2,
  CalendarX2,
} from "lucide-react";
import {
  listSignatureRequests,
  computeOverallStatus,
  SignatureRequest,
} from "@/lib/documents/signature/types";
import { onRecordsChange } from "@/lib/records-sync";
import type { RecentDocStatus } from "@/lib/documents/signature/recent-filters";
import { cn } from "@/lib/utils";

type StatCard = {
  icon: React.ElementType;
  iconClass: string;
  value: number;
  label: string;
  link: string;
  status: RecentDocStatus | null;
};

function buildStats(requests: SignatureRequest[]): StatCard[] {
  const docs = requests.filter((r) => r.recordType !== "template");
  const draft = docs.filter(
    (r) => computeOverallStatus(r) === "Draft",
  ).length;
  const inProgress = docs.filter((r) =>
    ["Sent", "Viewed", "In Progress"].includes(computeOverallStatus(r)),
  ).length;
  const signed = docs.filter(
    (r) => computeOverallStatus(r) === "Signed",
  ).length;
  const expired = docs.filter(
    (r) => computeOverallStatus(r) === "Expired",
  ).length;

  return [
    {
      icon: FileText,
      iconClass: "bg-slate-100 text-slate-600",
      value: docs.length,
      label: "All Documents",
      link: "View all documents",
      status: null,
    },
    {
      icon: PenLine,
      iconClass: "bg-amber-100 text-amber-600",
      value: draft,
      label: "Draft",
      link: "View draft documents",
      status: "Draft",
    },
    {
      icon: Clock,
      iconClass: "bg-indigo-100 text-indigo-600",
      value: inProgress,
      label: "In Progress",
      link: "View in-progress documents",
      status: "In Progress",
    },
    {
      icon: CheckCircle2,
      iconClass: "bg-emerald-100 text-emerald-600",
      value: signed,
      label: "Signed",
      link: "View signed documents",
      status: "Signed",
    },
    {
      icon: CalendarX2,
      iconClass: "bg-rose-100 text-rose-600",
      value: expired,
      label: "Expired",
      link: "View expired documents",
      status: "Expired",
    },
  ];
}

export function SignatureStatsGrid({
  activeStatus = null,
  onSelect,
}: {
  activeStatus?: RecentDocStatus | null | undefined;
  onSelect?: (status: RecentDocStatus | null) => void;
}) {
  const [requests, setRequests] = useState<SignatureRequest[]>(() =>
    listSignatureRequests(),
  );

  useEffect(() => {
    const refresh = () => setRequests(listSignatureRequests());
    refresh();
    return onRecordsChange(refresh);
  }, []);

  const stats = buildStats(requests);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => {
        const active = stat.status === activeStatus;
        return (
        <button
          key={stat.label}
          type="button"
          aria-pressed={active}
          onClick={() => onSelect?.(stat.status)}
          className={cn(
            "group rounded-2xl border bg-white px-4 py-3.5 text-left shadow-sm transition-colors",
            active
              ? "border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/30"
              : "border-slate-200/80 hover:border-[var(--brand-primary)]/25",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] leading-tight font-medium text-slate-500">
                {stat.label}
              </p>
              <p className="mt-1 text-[26px] leading-none font-bold tracking-tight text-slate-900">
                {stat.value}
              </p>
              <p className="mt-1.5 text-[11px] leading-snug font-medium text-[var(--brand-primary)] group-hover:underline">
                {stat.link}
              </p>
            </div>
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.iconClass}`}
            >
              <stat.icon className="h-5 w-5" strokeWidth={2} />
            </span>
          </div>
        </button>
        );
      })}
    </div>
  );
}

export default SignatureStatsGrid;
