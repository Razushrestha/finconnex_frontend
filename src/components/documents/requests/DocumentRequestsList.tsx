"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  Clock,
  User,
  Link2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import type {
  DocumentRequest,
  DocumentRequestType,
} from "@/lib/documents/requests/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STATUS_META: Record<
  string,
  { soft: string; text: string; border: string; dot: string }
> = {
  Requested: {
    soft: "bg-sky-50",
    text: "text-sky-700",
    border: "border-l-sky-500",
    dot: "bg-sky-500",
  },
  Pending: {
    soft: "bg-amber-50",
    text: "text-amber-800",
    border: "border-l-amber-500",
    dot: "bg-amber-500",
  },
  Received: {
    soft: "bg-violet-50",
    text: "text-violet-700",
    border: "border-l-violet-500",
    dot: "bg-violet-500",
  },
  Approved: {
    soft: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-l-emerald-500",
    dot: "bg-emerald-500",
  },
  Rejected: {
    soft: "bg-rose-50",
    text: "text-rose-700",
    border: "border-l-rose-500",
    dot: "bg-rose-500",
  },
  Expired: {
    soft: "bg-slate-100",
    text: "text-slate-600",
    border: "border-l-slate-400",
    dot: "bg-slate-400",
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
        !embedded && "rounded-xl border border-slate-200/80 bg-white shadow-sm",
      )}
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[960px] border-separate border-spacing-0 text-left text-[13px]">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
            <tr>
              {[
                "Request",
                "From",
                "Type",
                "Related To",
                "Due",
                "Status",
                "Requested By",
              ].map((label) => (
                <th
                  key={label}
                  className="border-b border-slate-200 px-4 py-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((r, i) => {
              const meta = STATUS_META[r.status];
              return (
                <tr
                  key={r.id}
                  className={cn(
                    "group transition-colors hover:bg-violet-50/50",
                    i % 2 === 1 && "bg-slate-50/40",
                  )}
                >
                  <td className="max-w-[260px] border-b border-slate-100 px-4 py-3">
                    <Link
                      href={`/documents/requests/${r.id}`}
                      className="flex items-center gap-2.5"
                    >
                      <span
                        className={cn(
                          "h-8 w-1 shrink-0 rounded-full",
                          meta?.text.replace("text-", "bg-") ?? "bg-slate-300",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900 group-hover:text-violet-700">
                          {r.title}
                        </span>
                        {"requestId" in r && (r as any).requestId ? (
                          <span className="block text-[10px] font-medium text-slate-400">
                            {(r as any).requestId}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                    {r.requestedFrom}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold",
                        TYPE_SOFT[r.documentType],
                      )}
                    >
                      {r.documentType}
                    </span>
                  </td>
                  <td className="max-w-[160px] truncate border-b border-slate-100 px-4 py-3 text-slate-500">
                    {r.relatedTo || ""}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 whitespace-nowrap text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {r.dueDate}
                    </span>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                        meta?.soft,
                        meta?.text,
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          meta?.dot ?? "bg-slate-400",
                        )}
                      />
                      {r.status}
                    </span>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ring-2 ring-white",
                          avatarColor(r.requestedBy),
                        )}
                      >
                        {initials(r.requestedBy)}
                      </span>
                      <span className="truncate text-slate-700">
                        {r.requestedBy}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Inbox className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">
                      No requests match your filters
                    </p>
                    <p className="text-[12px] text-slate-400">
                      Try adjusting or clearing your filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11.5px] text-slate-500">
        <span>
          Showing{" "}
          <span className="font-medium text-slate-700">
            {data.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–
            {Math.min(safePage * pageSize, data.length)}
          </span>{" "}
          of <span className="font-medium text-slate-700">{data.length}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </button>
          <span className="px-1 text-slate-400">
            Page <span className="font-medium text-slate-700">{safePage}</span>{" "}
            of {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
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
