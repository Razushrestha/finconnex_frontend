"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp,
  Check,
  Download,
  FileText,
  MoreVertical,
} from "lucide-react";
import {
  DOCUMENT_REQUEST_STATUS_LABEL,
  DOCUMENT_REQUEST_STATUS_PILL,
  formatRelativeFromDisplay,
  type DocumentRequest,
  type DocumentRequestType,
} from "@/lib/documents/requests/types";
import { RequestOverviewPanel } from "@/components/documents/requests/RequestOverviewPanel";
import { cn } from "@/lib/utils";

const TYPE_SOFT: Record<DocumentRequestType, string> = {
  Contract: "bg-violet-50 text-violet-700",
  Proposal: "bg-sky-50 text-sky-700",
  "ID Proof": "bg-amber-50 text-amber-800",
  Financial: "bg-emerald-50 text-emerald-700",
  Legal: "bg-rose-50 text-rose-700",
  Other: "bg-slate-100 text-slate-600",
  Refinance: "bg-indigo-50 text-indigo-700",
  "Property purchase": "bg-teal-50 text-teal-700",
};

function ProgressRing({
  value,
  downloadable,
}: {
  value: number;
  downloadable?: boolean;
}) {
  const size = 40;
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const complete = clamped >= 100;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="relative"
        style={{ width: size, height: size }}
        title={`${clamped}% complete`}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={stroke}
          />
          {!complete && clamped > 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#5A32A3"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          ) : null}
          {complete ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="#16a34a"
              stroke="#16a34a"
              strokeWidth={stroke}
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {complete ? (
            <Check className="h-4 w-4 text-white" strokeWidth={3} />
          ) : (
            <span className="text-[10px] font-semibold tabular-nums text-slate-700">
              {clamped}%
            </span>
          )}
        </div>
      </div>
      {complete && downloadable ? (
        <Download className="h-3 w-3 text-slate-400" />
      ) : null}
    </div>
  );
}

function DateCell({ value }: { value: string }) {
  const relative = formatRelativeFromDisplay(value);
  return (
    <div className="min-w-0">
      <p className="whitespace-nowrap text-[13px] text-slate-800">{value}</p>
      {relative ? (
        <p className="text-[11px] text-slate-400">{relative}</p>
      ) : null}
    </div>
  );
}

function RowActions({ request }: { request: DocumentRequest }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        type="button"
        aria-label="Actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-44 rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-[#F3ECFB] hover:text-[#5A32A3]"
            onClick={() => {
              setOpen(false);
              router.push(`/documents/requests/${request.id}`);
            }}
          >
            View request
          </button>
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-[#F3ECFB] hover:text-[#5A32A3]"
            onClick={() => {
              setOpen(false);
              router.push(`/documents/requests/${request.id}`);
            }}
          >
            Send reminder
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface DocumentRequestsListProps {
  data: DocumentRequest[];
  embedded?: boolean;
}

export function DocumentRequestsList({ data }: DocumentRequestsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 text-[12px] font-medium text-slate-500">
              <th className="px-5 py-3.5 font-medium">Applicant names</th>
              <th className="px-4 py-3.5 font-medium">Broker</th>
              <th className="px-4 py-3.5 font-medium">Document Request ID</th>
              <th className="px-4 py-3.5 font-medium">Type</th>
              <th className="px-4 py-3.5 font-medium">
                <span className="inline-flex items-center gap-1">
                  Start date
                  <ArrowDownUp className="h-3 w-3 text-slate-400" />
                </span>
              </th>
              <th className="px-4 py-3.5 font-medium">
                <span className="inline-flex items-center gap-1">
                  Last updated
                  <ArrowDownUp className="h-3 w-3 text-slate-400" />
                </span>
              </th>
              <th className="px-4 py-3.5 font-medium">Status</th>
              <th className="px-4 py-3.5 text-center font-medium">Progress</th>
              <th className="w-12 px-3 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {data.map((r) => {
              const open = expandedId === r.id;
              return (
                <Fragment key={r.id}>
                  <tr
                    className={cn(
                      "cursor-pointer border-b border-slate-100 transition-colors hover:bg-[#F3ECFB]/55",
                      open && "bg-[#F8F4FC]",
                    )}
                    onClick={() => setExpandedId(open ? null : r.id)}
                  >
                    <td className="px-5 py-4">
                      <p
                        className="max-w-[220px] truncate text-[13.5px] font-medium text-slate-900"
                        title={r.requestedFrom}
                      >
                        {r.requestedFrom}
                      </p>
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-4 text-[13px] text-slate-600">
                      {r.requestedBy}
                    </td>
                    <td className="px-4 py-4 font-mono text-[12.5px] text-slate-700">
                      {r.requestId}
                    </td>
                    <td className="px-4 py-4 text-[13px] text-slate-700">
                      {r.documentType}
                    </td>
                    <td className="px-4 py-4">
                      <DateCell value={r.requestedDate} />
                    </td>
                    <td className="px-4 py-4">
                      <DateCell value={r.lastUpdated} />
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          DOCUMENT_REQUEST_STATUS_PILL[r.status],
                        )}
                      >
                        {DOCUMENT_REQUEST_STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <ProgressRing
                          value={r.progress}
                          downloadable={Boolean(r.receivedFileName)}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <RowActions request={r} />
                    </td>
                  </tr>
                  {open ? (
                    <tr className="border-b border-slate-100 last:border-b-0">
                      <td
                        colSpan={9}
                        className="bg-[#F6F4F8] px-4 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RequestOverviewPanel request={r} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {data.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <FileText className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">
                      No document requests match your filters
                    </p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Kept for kanban cards on other surfaces if needed */
export function DocumentRequestCard({
  request,
}: {
  request: DocumentRequest;
  columnId?: string;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
}) {
  return (
    <Link
      href={`/documents/requests/${request.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-[#5A32A3]/30"
    >
      <p className="truncate text-[13px] font-semibold text-slate-900">
        {request.requestedFrom}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400">{request.requestId}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            TYPE_SOFT[request.documentType],
          )}
        >
          {request.documentType}
        </span>
        <ProgressRing value={request.progress} />
      </div>
    </Link>
  );
}

export const STATUS_META: Record<
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
    soft: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-l-emerald-500",
    dot: "bg-emerald-500",
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

export { TYPE_SOFT };
