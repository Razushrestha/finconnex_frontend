"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Plus,
  Search,
  MessageSquare,
  Download,
} from "lucide-react";
import {
  SMS_CAMPAIGN_STATUSES,
  SMS_CAMPAIGN_TYPES,
  deliveryRate,
  listSmsCampaigns,
  smsCampaigns as seed,
  type SmsCampaign,
  type SmsCampaignStatus,
  type SmsCampaignType,
} from "@/lib/marketing/sms/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<SmsCampaignStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Scheduled: "bg-sky-50 text-sky-700",
  Running: "bg-amber-50 text-amber-800",
  Paused: "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

export default function SmsCampaignsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SmsCampaign[]>(seed);
  const [statusTab, setStatusTab] = useState<SmsCampaignStatus | "All">("All");
  const [typeFilter, setTypeFilter] = useState<SmsCampaignType | "All">("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setRows(listSmsCampaigns());
  }, []);

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      SMS_CAMPAIGN_STATUSES.map((s) => [s, 0]),
    ) as Record<SmsCampaignStatus, number>;
    for (const r of rows) map[r.status] += 1;
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    let data = rows;
    if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
    if (typeFilter !== "All") data = data.filter((r) => r.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.campaignId.toLowerCase().includes(q) ||
          r.message.toLowerCase().includes(q) ||
          r.audience.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, statusTab, typeFilter, search]);

  function exportCsv() {
    const header = [
      "ID",
      "Name",
      "Type",
      "Status",
      "Audience",
      "Sent",
      "Delivered",
      "Failed",
      "Replies",
    ];
    const body = filtered.map((r) =>
      [
        r.campaignId,
        r.name,
        r.type,
        r.status,
        r.audience,
        r.sentCount,
        r.deliveredCount,
        r.failedCount,
        r.replyCount,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sms-campaigns.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      <div className="relative mx-auto flex max-w-[1400px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
              <span className="text-slate-500">Marketing</span>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              SMS Campaigns
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-sky-700 uppercase">
              <MessageSquare className="h-2.5 w-2.5" />
              §10.2
            </span>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/marketing/sms/create?layoutid=standard&redirect=false",
                )
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" />
              New SMS
            </button>
          </div>
        </div>

        <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-4">
            <div className="flex flex-wrap gap-0.5 rounded-lg bg-slate-50 p-0.5">
              {(["All", ...SMS_CAMPAIGN_STATUSES] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusTab(s)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-semibold",
                    statusTab === s
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-slate-500",
                  )}
                >
                  {s}
                  {s !== "All" ? (
                    <span className="ml-1.5 text-[9px] tabular-nums text-slate-400">
                      {counts[s]}
                    </span>
                  ) : (
                    <span className="ml-1.5 text-[9px] tabular-nums text-slate-400">
                      {rows.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-8 w-44 rounded-lg border border-slate-200/90 bg-white pr-2.5 pl-8 text-[11px] outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-b border-slate-100 px-3 py-1.5 sm:px-4">
            {SMS_CAMPAIGN_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(typeFilter === t ? "All" : t)}
                className={cn(
                  "rounded-md px-2 py-1 text-[10px] font-semibold",
                  typeFilter === t
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[980px] text-left text-[12px]">
              <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Campaign</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Message</th>
                  <th className="px-4 py-2.5">Audience</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Sent</th>
                  <th className="px-4 py-2.5">Delivered</th>
                  <th className="px-4 py-2.5">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer hover:bg-violet-50/40"
                    onClick={() => router.push(`/marketing/sms/${r.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{r.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {r.campaignId}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.type}</td>
                    <td className="max-w-[240px] truncate px-4 py-3 text-slate-600">
                      {r.message}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.audience}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          STATUS_STYLE[r.status],
                        )}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.sentCount}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-500">
                      {deliveryRate(r)}
                      <span className="text-slate-300"> · </span>
                      {r.replyCount} replies
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold",
                            avatarColor(r.createdBy),
                          )}
                        >
                          {initials(r.createdBy)}
                        </span>
                        {r.createdBy}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-16 text-center text-sm text-slate-400"
                    >
                      No SMS campaigns match.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
