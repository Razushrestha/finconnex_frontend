"use client";

import { useEffect, useState } from "react";
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
import { onRecordsChange } from "@/lib/records-sync";

type StatCard = {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: number;
  label: string;
  link: string;
  href: string;
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
      iconBg: "bg-blue-50 dark:bg-blue-950/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      value: docs.length,
      label: "All Documents",
      link: "View all documents",
      href: "/signature/documents",
    },
    {
      icon: PenLine,
      iconBg: "bg-blue-50 dark:bg-blue-950/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      value: draft,
      label: "Draft",
      link: "View draft documents",
      href: "/signature/documents?status=draft",
    },
    {
      icon: Clock,
      iconBg: "bg-blue-50 dark:bg-blue-950/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      value: inProgress,
      label: "In Progress",
      link: "View in-progress documents",
      href: "/signature/documents?status=in-progress",
    },
    {
      icon: CheckCircle2,
      iconBg: "bg-blue-50 dark:bg-blue-950/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      value: signed,
      label: "Signed",
      link: "View signed documents",
      href: "/signature/documents?status=signed",
    },
    {
      icon: CalendarX2,
      iconBg: "bg-blue-50 dark:bg-blue-950/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      value: expired,
      label: "Expired",
      link: "View expired documents",
      href: "/signature/documents?status=expired",
    },
  ];
}

export function SignatureStatsGrid() {
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
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => {
        const cardContent = (
          <div className="group flex h-full cursor-pointer flex-col justify-between rounded-md border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_10px_25px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-blue-500/50 dark:hover:shadow-[0_4px_20px_rgba(59,130,246,0.25)]">
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
              <span className="text-xs font-semibold text-blue-600 group-hover:underline dark:text-blue-400">
                {stat.link}
              </span>
            </div>
          </div>
        );

        return (
          <div key={stat.label} className="flex flex-col">
            <Link href={stat.href} className="flex h-full flex-col">
              {cardContent}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export default SignatureStatsGrid;
