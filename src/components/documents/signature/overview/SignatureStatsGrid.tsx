"use client";

import { useState } from "react";
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

type StatCard = {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: number;
  label: string;
  sub?: string;
  link?: string;
};

function buildStats(requests: SignatureRequest[]): StatCard[] {
  const draft = requests.filter(
    (r) => computeOverallStatus(r) === "Draft",
  ).length;
  const inProgress = requests.filter((r) =>
    ["Sent", "Viewed", "In Progress"].includes(computeOverallStatus(r)),
  ).length;
  const signed = requests.filter(
    (r) => computeOverallStatus(r) === "Signed",
  ).length;
  const expired = requests.filter(
    (r) => computeOverallStatus(r) === "Expired",
  ).length;

  return [
    {
      icon: FileText,
      iconBg: "bg-violet-50 dark:bg-violet-950/50",
      iconColor: "text-violet-600 dark:text-violet-400",
      value: requests.length,
      label: "All Documents",
      link: "View all documents",
    },
    {
      icon: PenLine,
      iconBg: "bg-purple-50 dark:bg-purple-950/50",
      iconColor: "text-purple-600 dark:text-purple-400",
      value: draft,
      label: "Draft",
      link: "View draft documents",
    },
    {
      icon: Clock,
      iconBg: "bg-blue-50 dark:bg-blue-950/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      value: inProgress,
      label: "In Progress",
      sub: "Awaiting signatures",
    },
    {
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/50",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      value: signed,
      label: "Signed",
      sub: "Successfully signed",
    },
    {
      icon: CalendarX2,
      iconBg: "bg-rose-50 dark:bg-rose-950/50",
      iconColor: "text-rose-600 dark:text-rose-400",
      value: expired,
      label: "Expired",
      sub: "Expired documents",
    },
  ];
}

export function SignatureStatsGrid() {
  const [requests] = useState<SignatureRequest[]>(() =>
    listSignatureRequests(),
  );
  const stats = buildStats(requests);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div
            className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${stat.iconBg}`}
          >
            <stat.icon
              className={`h-4 w-4 ${stat.iconColor}`}
              strokeWidth={2}
            />
          </div>
          <div className="text-2xl font-semibold text-slate-900 dark:text-white">
            {stat.value}
          </div>
          <div className="text-sm text-slate-700 dark:text-zinc-300">
            {stat.label}
          </div>
          {stat.link ? (
            <button className="mt-3 text-xs font-medium text-violet-600 hover:underline dark:text-violet-400">
              {stat.link}
            </button>
          ) : (
            <div className="mt-3 text-xs text-slate-400 dark:text-zinc-500">
              {stat.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default SignatureStatsGrid;
