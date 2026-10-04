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
  iconClass: string;
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
      iconClass: "bg-slate-100 text-slate-600",
      value: docs.length,
      label: "All Documents",
      link: "View all documents",
      href: "/signature/documents",
    },
    {
      icon: PenLine,
      iconClass: "bg-amber-100 text-amber-600",
      value: draft,
      label: "Draft",
      link: "View draft documents",
      href: "/signature/documents?status=draft",
    },
    {
      icon: Clock,
      iconClass: "bg-indigo-100 text-indigo-600",
      value: inProgress,
      label: "In Progress",
      link: "View in-progress documents",
      href: "/signature/documents?status=in-progress",
    },
    {
      icon: CheckCircle2,
      iconClass: "bg-emerald-100 text-emerald-600",
      value: signed,
      label: "Signed",
      link: "View signed documents",
      href: "/signature/documents?status=signed",
    },
    {
      icon: CalendarX2,
      iconClass: "bg-rose-100 text-rose-600",
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <Link
          key={stat.label}
          href={stat.href}
          className="group rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm transition-colors hover:border-[#5A32A3]/25"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] leading-tight font-medium text-slate-500">
                {stat.label}
              </p>
              <p className="mt-1 text-[26px] leading-none font-bold tracking-tight text-slate-900">
                {stat.value}
              </p>
              <p className="mt-1.5 text-[11px] leading-snug font-medium text-[#5A32A3] group-hover:underline">
                {stat.link}
              </p>
            </div>
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.iconClass}`}
            >
              <stat.icon className="h-5 w-5" strokeWidth={2} />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default SignatureStatsGrid;
