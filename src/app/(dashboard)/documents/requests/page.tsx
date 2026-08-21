"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Plus, Search } from "lucide-react";
import {
  DOCUMENT_REQUEST_BROKERS,
  DOCUMENT_REQUEST_STATUSES,
  DOCUMENT_REQUEST_STATUS_LABEL,
  listDocumentRequests,
  type DocumentRequest,
  type DocumentRequestStatus,
} from "@/lib/documents/requests/types";
import { DocumentRequestsList } from "@/components/documents/requests/DocumentRequestsList";

type StatusFilter = "All" | "Active" | DocumentRequestStatus;

const ACTIVE_STATUSES: DocumentRequestStatus[] = [
  "Requested",
  "Pending",
  "Received",
];

export default function DocumentRequestsPage() {
  const [rows, setRows] = useState<DocumentRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Active");
  const [brokerFilter, setBrokerFilter] = useState<string>("All");

  useEffect(() => {
    setRows(listDocumentRequests());
  }, []);

  const filtered = useMemo(() => {
    let data = rows;
    if (statusFilter === "Active") {
      data = data.filter((r) => ACTIVE_STATUSES.includes(r.status));
    } else if (statusFilter !== "All") {
      data = data.filter((r) => r.status === statusFilter);
    }
    if (brokerFilter !== "All") {
      data = data.filter((r) => r.requestedBy === brokerFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.requestedFrom.toLowerCase().includes(q) ||
          r.requestId.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.requestedBy.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, statusFilter, brokerFilter, search]);

  function exportCsv() {
    const header = [
      "Applicant",
      "Broker",
      "Request ID",
      "Type",
      "Start date",
      "Last updated",
      "Status",
      "Progress",
    ];
    const lines = filtered.map((r) =>
      [
        r.requestedFrom,
        r.requestedBy,
        r.requestId,
        r.documentType,
        r.requestedDate,
        r.lastUpdated,
        DOCUMENT_REQUEST_STATUS_LABEL[r.status],
        `${r.progress}%`,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document-requests.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-full bg-[#f4f2f7]">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
              Document Requests
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              {filtered.length} Document Request
              {filtered.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[240px] flex-1 sm:min-w-[280px]">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Applicant name or application ID search"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/15"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-[#5A32A3]/45"
              aria-label="Status"
            >
              <option value="Active">Status · Active</option>
              <option value="All">All statuses</option>
              {DOCUMENT_REQUEST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {DOCUMENT_REQUEST_STATUS_LABEL[s]}
                </option>
              ))}
            </select>

            <select
              value={brokerFilter}
              onChange={(e) => setBrokerFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-[#5A32A3]/45"
              aria-label="Broker"
            >
              <option value="All">All brokers</option>
              {DOCUMENT_REQUEST_BROKERS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>

            <Link
              href="/documents/requests/create?layoutid=standard&redirect=false"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-[13px] font-semibold text-white hover:bg-black"
            >
              <Plus className="h-4 w-4" />
              Create
            </Link>
          </div>
        </div>

        <DocumentRequestsList data={filtered} />
      </div>
    </div>
  );
}
