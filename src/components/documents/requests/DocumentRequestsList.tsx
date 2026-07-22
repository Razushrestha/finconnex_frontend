"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  Clock,
  User,
  Link2,
  Calendar,
} from "lucide-react";
import type { DocumentRequest, DocumentRequestType } from "@/lib/documents/requests/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STATUS_META: Record<
  string,
  { soft: string; text: string; border: string }
> = {
  Requested: {
    soft: "bg-sky-50",
    text: "text-sky-700",
    border: "border-l-sky-500",
  },
  Pending: {
    soft: "bg-amber-50",
    text: "text-amber-800",
    border: "border-l-amber-500",
  },
  Received: {
    soft: "bg-violet-50",
    text: "text-violet-700",
    border: "border-l-violet-500",
  },
  Approved: {
    soft: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-l-emerald-500",
  },
  Rejected: {
    soft: "bg-rose-50",
    text: "text-rose-700",
    border: "border-l-rose-500",
  },
  Expired: {
    soft: "bg-slate-100",
    text: "text-slate-600",
    border: "border-l-slate-400",
  },
};

const TYPE_SOFT: Record<DocumentRequestType, string> = {
  Contract: "bg-violet-50 text-violet-700",
  Proposal: "bg-sky-50 text-sky-700",
  "ID Proof": "bg-amber-50 text-amber-800",
  Financial: "bg-emerald-50 text-emerald-700",
  Legal: "bg-rose-50 text-rose-700",
  Other: "bg-slate-100 text-slate-600",
};

interface DocumentRequestsListProps {
  data: DocumentRequest[];
  embedded?: boolean;
}

export function DocumentRequestsList({
  data,
  embedded = false,
}: DocumentRequestsListProps) {
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => data.slice((safePage - 1) * pageSize, safePage * pageSize),
    [data, safePage],
  );

  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col overflow-hidden",
        !embedded &&
          "rounded-2xl border border-slate-200/80 bg-white shadow-sm",
      )}
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[960px] text-left text-[12px]">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            <tr>
              <th className="px-4 py-2.5">Request</th>
              <th className="px-4 py-2.5">From</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Related To</th>
              <th className="px-4 py-2.5">Due</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Requested By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.map((r) => {
              const meta = STATUS_META[r.status];
              return (
                <tr
                  key={r.id}
                  className="transition-colors hover:bg-violet-50/40"
                >
                  <td className="max-w-[240px] px-4 py-3">
                    <Link
                      href={`/documents/requests/${r.id}`}
                      className="block"
                    >
                      <p className="truncate font-semibold text-slate-900 hover:text-violet-700">
                        {r.title}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {r.requestId}
                      </p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.requestedFrom}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        TYPE_SOFT[r.documentType],
                      )}
                    >
                      {r.documentType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.relatedTo ?? "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                    {r.dueDate}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        meta.soft,
                        meta.text,
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold",
                          avatarColor(r.requestedBy),
                        )}
                      >
                        {initials(r.requestedBy)}
                      </span>
                      <span className="text-slate-700">{r.requestedBy}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-16 text-center text-sm text-slate-400"
                >
                  No requests match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
        <span>
          Showing {(safePage - 1) * pageSize + 1}–
          {Math.min(safePage * pageSize, data.length)} of {data.length}
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
    </div>
  );
}

export function DocumentRequestCard({
  request,
  columnId,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  request: DocumentRequest;
  columnId: string;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  const meta = STATUS_META[request.status];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-request-id={request.id}
      data-column-id={columnId}
      className={cn(
        "cursor-grab select-none rounded-xl border border-slate-100 border-l-[3px] bg-white p-3 shadow-sm transition-all active:cursor-grabbing",
        meta.border,
        isDragging ? "opacity-40" : "hover:border-slate-200 hover:shadow-md",
      )}
    >
      <Link href={`/documents/requests/${request.id}`} className="block">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h4 className="text-[13px] font-semibold leading-snug text-slate-900">
            {request.title}
          </h4>
          <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </div>
        <p className="mb-2 text-[10px] font-medium text-slate-400">
          {request.requestId}
        </p>
        <div className="space-y-1 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{request.requestedFrom}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
            <span>Due {request.dueDate}</span>
          </div>
          {request.relatedTo ? (
            <div className="flex items-center gap-1.5">
              <Link2 className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{request.relatedTo}</span>
            </div>
          ) : null}
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-slate-50 pt-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              TYPE_SOFT[request.documentType],
            )}
          >
            {request.documentType}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
            <Clock className="h-3 w-3" />
            {request.requestedDate}
          </span>
        </div>
      </Link>
    </div>
  );
}

export { STATUS_META, TYPE_SOFT };
