"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Plus,
  Search,
  PenLine,
  Download,
} from "lucide-react";
import {
  SIGNATURE_STATUSES,
  signatureRequests as seed,
  listSignatureRequests,
  type SignatureRequest,
  type SignatureStatus,
} from "@/lib/documents/signature/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<SignatureStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Sent: "bg-sky-50 text-sky-700",
  Viewed: "bg-amber-50 text-amber-800",
  Signed: "bg-emerald-50 text-emerald-700",
  Declined: "bg-rose-50 text-rose-700",
  Expired: "bg-slate-100 text-slate-500",
  Cancelled: "bg-slate-100 text-slate-500",
};

const STATUS_DOT: Record<SignatureStatus, string> = {
  Draft: "bg-slate-400",
  Sent: "bg-sky-500",
  Viewed: "bg-amber-500",
  Signed: "bg-emerald-500",
  Declined: "bg-rose-500",
  Expired: "bg-slate-400",
  Cancelled: "bg-slate-400",
};

export default function ESignaturePage() {
  const router = useRouter();
  const [requests, setRequests] = useState<SignatureRequest[]>(seed);
  const [statusTab, setStatusTab] = useState<SignatureStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setRequests(listSignatureRequests());
  }, []);

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      SIGNATURE_STATUSES.map((s) => [s, 0]),
    ) as Record<SignatureStatus, number>;
    for (const r of requests) map[r.status] += 1;
    return map;
  }, [requests]);

  const filtered = useMemo(() => {
    let data: SignatureRequest[] = requests;
    if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.documentName.toLowerCase().includes(q) ||
          r.signatureRequestId.toLowerCase().includes(q) ||
          r.signer.toLowerCase().includes(q) ||
          (r.relatedTo?.toLowerCase().includes(q) ?? false),
      );
    }
    return data;
  }, [requests, statusTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [statusTab, search]);

  function exportCsv() {
    const header = [
      "ID",
      "Document",
      "Signer",
      "Status",
      "Sent",
      "Signed",
      "Expiry",
    ];
    const rows = filtered.map((r) =>
      [
        r.signatureRequestId,
        r.documentName,
        r.signer,
        r.status,
        r.sentDate ?? "",
        r.signedDate ?? "",
        r.expiryDate,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "e-signature-log.csv";
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
              <span className="text-slate-500">Documents</span>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              E-Signature
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <PenLine className="h-2.5 w-2.5" />
              Native sign
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export log
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/documents/signature/create?layoutid=standard&redirect=false",
                )
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" />
              New signature
            </button>
          </div>
        </div>

        <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-4">
            <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-slate-50 p-0.5">
              <TabBtn
                active={statusTab === "All"}
                onClick={() => setStatusTab("All")}
                label="All"
                count={requests.length}
              />
              {SIGNATURE_STATUSES.map((s) => (
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
                className="h-8 w-44 rounded-lg border border-slate-200/90 bg-white pr-2.5 pl-8 text-[11px] outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] sm:w-52"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-3 py-1.5 sm:px-4">
            {SIGNATURE_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusTab(statusTab === s ? "All" : s)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold",
                  statusTab === s
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-500 hover:bg-slate-50",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[s])} />
                {s}
                <span className="tabular-nums text-slate-400">{counts[s]}</span>
              </button>
            ))}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[920px] text-left text-[12px]">
              <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Document</th>
                  <th className="px-4 py-2.5">Signer</th>
                  <th className="px-4 py-2.5">Related To</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Sent</th>
                  <th className="px-4 py-2.5">Expiry</th>
                  <th className="px-4 py-2.5">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer transition-colors hover:bg-violet-50/40"
                    onClick={() => router.push(`/documents/signature/${r.id}`)}
                  >
                    <td className="max-w-[240px] px-4 py-3">
                      <p className="truncate font-semibold text-slate-900">
                        {r.documentName}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {r.signatureRequestId}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{r.signer}</p>
                      <p className="text-[10px] text-slate-400">
                        {r.signerEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {r.relatedTo ?? "—"}
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
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {r.sentDate ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {r.expiryDate}
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
                      colSpan={7}
                      className="px-4 py-16 text-center text-sm text-slate-400"
                    >
                      No signature requests match.
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
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all",
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
