"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Plus, Search, Mail, Download, Megaphone } from "lucide-react";
import {
  EMAIL_CAMPAIGN_STATUSES,
  EMAIL_CAMPAIGN_TYPES,
  clickRate,
  emailCampaigns as seed,
  listEmailCampaigns,
  openRate,
  type EmailCampaign,
  type EmailCampaignStatus,
  type EmailCampaignType,
} from "@/lib/marketing/email/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<EmailCampaignStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Scheduled: "bg-sky-50 text-sky-700",
  Running: "bg-amber-50 text-amber-800",
  Paused: "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

export default function EmailCampaignsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<EmailCampaign[]>(seed);
  const [statusTab, setStatusTab] = useState<EmailCampaignStatus | "All">(
    "All",
  );
  const [typeFilter, setTypeFilter] = useState<EmailCampaignType | "All">(
    "All",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setRows(listEmailCampaigns());
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusTab, typeFilter, search]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      EMAIL_CAMPAIGN_STATUSES.map((s) => [s, 0]),
    ) as Record<EmailCampaignStatus, number>;
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
          r.subject.toLowerCase().includes(q) ||
          r.audience.toLowerCase().includes(q) ||
          r.templateName.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, statusTab, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  function exportCsv() {
    const header = [
      "ID",
      "Name",
      "Type",
      "Status",
      "Audience",
      "Subject",
      "Sent",
      "Opens",
      "Clicks",
      "Bounces",
      "Unsubs",
    ];
    const body = filtered.map((r) =>
      [
        r.campaignId,
        r.name,
        r.type,
        r.status,
        r.audience,
        r.subject,
        r.sentCount,
        r.openCount,
        r.clickCount,
        r.bounceCount,
        r.unsubscribeCount,
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
    a.download = "email-campaigns.csv";
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
              Email Campaigns
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <Megaphone className="h-2.5 w-2.5" />
              §10.1
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/marketing/email/create?layoutid=standard&redirect=false",
                )
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" />
              New campaign
            </button>
          </div>
        </div>

        <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-4">
            <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-slate-50 p-0.5">
              <TabBtn
                active={statusTab === "All"}
                onClick={() => setStatusTab("All")}
                label="All"
                count={rows.length}
              />
              {EMAIL_CAMPAIGN_STATUSES.map((s) => (
                <TabBtn
                  key={s}
                  active={statusTab === s}
                  onClick={() => setStatusTab(s)}
                  label={s}
                  count={counts[s]}
                  compact
                />
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-8 w-48 rounded-lg border border-slate-200/90 bg-white pr-2.5 pl-8 text-[11px] outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-b border-slate-100 px-3 py-1.5 sm:px-4">
            {EMAIL_CAMPAIGN_TYPES.map((t) => (
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

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[1100px] text-left text-[12px]">
                <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Campaign</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Subject</th>
                    <th className="px-4 py-2.5">Audience</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Sent</th>
                    <th className="px-4 py-2.5">Open / Click</th>
                    <th className="px-4 py-2.5">Created By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map((r) => (
                    <tr
                      key={r.id}
                      className="cursor-pointer transition-colors hover:bg-violet-50/40"
                      onClick={() => router.push(`/marketing/email/${r.id}`)}
                    >
                      <td className="max-w-[200px] px-4 py-3">
                        <p className="truncate font-semibold text-slate-900">
                          {r.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {r.campaignId} · {r.templateName}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.type}</td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-600">
                        {r.subject}
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-slate-500">
                        {r.audience}
                      </td>
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
                      <td className="px-4 py-3 tabular-nums text-slate-600">
                        {r.sentCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-500">
                        {openRate(r)}
                        <span className="text-slate-300"> · </span>
                        {clickRate(r)}
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
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-20 text-center text-sm text-slate-400"
                      >
                        <Mail className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                        No campaigns match. Create one to start nurturing.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 ? (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
                <span>
                  Showing {(safePage - 1) * pageSize + 1}–
                  {Math.min(safePage * pageSize, filtered.length)} of{" "}
                  {filtered.length}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={safePage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={safePage === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  count,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold",
        compact && "hidden xl:inline-flex",
        active
          ? "bg-white text-violet-700 shadow-sm"
          : "text-slate-500 hover:text-slate-800",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-px text-[9px] font-bold tabular-nums",
          active
            ? "bg-violet-100 text-violet-700"
            : "bg-slate-200/80 text-slate-500",
        )}
      >
        {count}
      </span>
    </button>
  );
}
