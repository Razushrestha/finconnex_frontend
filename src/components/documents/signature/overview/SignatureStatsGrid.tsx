"use client";

import { useState } from "react";
import Link from "next/link";
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
  href?: string;
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
      iconBg: "bg-blue-50 dark:bg-blue-950/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      value: requests.length,
      label: "All Documents",
      link: "View all documents",
      href: "/documents/signature/documents",
    },
    {
      icon: PenLine,
      iconBg: "bg-blue-50 dark:bg-blue-950/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      value: draft,
      label: "Draft",
      link: "View draft documents",
      href: "/documents/signature/documents?status=draft",
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
      iconBg: "bg-blue-50 dark:bg-blue-950/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      value: signed,
      label: "Signed",
      sub: "Successfully signed",
    },
    {
      icon: CalendarX2,
      iconBg: "bg-blue-50 dark:bg-blue-950/50",
      iconColor: "text-blue-600 dark:text-blue-400",
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
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => {
        const cardContent = (
          <div
            className={`group flex h-full flex-col justify-between rounded-md border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_10px_25px_rgba(15,23,42,0.04)] transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950 ${
              stat.href
                ? "hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)] dark:hover:border-blue-500/50 dark:hover:shadow-[0_4px_20px_rgba(59,130,246,0.25)]"
                : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-105 ${stat.iconBg}`}
              >
                <stat.icon
                  className={`h-5 w-5 ${stat.iconColor}`}
                  strokeWidth={2}
                />
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-slate-900 dark:text-zinc-200">
                  {stat.label}
                </div>
              </div>
            </div>
            <div className="mt-4">
              {stat.link ? (
                <span className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
                  {stat.link}
                </span>
              ) : (
                <div className="text-xs text-slate-500 dark:text-zinc-400">
                  {stat.sub}
                </div>
              )}
            </div>
          </div>
        );

        return (
          <div key={stat.label} className="flex flex-col">
            {stat.href ? (
              <Link href={stat.href} className="flex h-full flex-col">
                {cardContent}
              </Link>
            ) : (
              cardContent
            )}
          </div>
        );
      })}
    </div>
  );
}

export default SignatureStatsGrid;
