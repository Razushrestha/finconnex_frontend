"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  CalendarDays,
  Check,
  Clock3,
  Eye,
  FileText,
  MoreVertical,
  User,
  Info,
} from "lucide-react";
import { initials } from "@/lib/activities/shared";
import {
  formatRelativeFromDisplay,
  upsertDocumentRequest,
  type DocumentRequest,
  type DocumentRequestType,
} from "@/lib/documents/requests/types";
import {
  displayRequestStatus,
  nextDocumentSort,
  sortDocumentRequests,
  type DocumentSortKey,
} from "@/lib/documents/requests/dashboard";
import {
  appendTimeline,
  downloadRequestFiles,
  nowStamp,
  uploadedItems,
} from "@/lib/documents/requests/pack";
import { cn } from "@/lib/utils";
import { EditRemindersModal } from "@/components/documents/requests/EditRemindersModal";

const AVATAR_SOLID = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-indigo-500",
];

function avatarSolid(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return AVATAR_SOLID[h % AVATAR_SOLID.length];
}

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
}: {
  value: number;
}) {
  const size = 36;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const complete = clamped >= 100;

  return (
    <div className="flex items-center justify-center">
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
    </div>
  );
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  const Icon = !active ? ArrowDownUp : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 font-semibold tracking-wide uppercase",
        active ? "text-[#5A32A3]" : "text-slate-400 hover:text-slate-600",
      )}
    >
      {label}
      <Icon className="h-3 w-3 shrink-0" />
    </button>
  );
}

function DateCell({ value }: { value: string }) {
  const relative = formatRelativeFromDisplay(value);
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[12.5px] leading-tight text-slate-800">
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate">{value}</span>
      </p>
      {relative ? (
        <p className="mt-0.5 flex items-center gap-1.5 pl-[20px] text-[10.5px] text-slate-400">
          <Clock3 className="h-3 w-3 shrink-0 text-slate-300" />
          {relative}
        </p>
      ) : null}
    </div>
  );
}

function RowActions({
  request,
  onRefresh,
  onToast,
}: {
  request: DocumentRequest;
  onRefresh?: () => void;
  onToast?: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [notifyCancel, setNotifyCancel] = useState(false);
  const [editingReminders, setEditingReminders] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const closed =
    request.status === "Approved" ||
    request.status === "Rejected" ||
    request.status === "Expired";
  const hasFiles = uploadedItems(request).length > 0;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirmCancel(false);
        setNotifyCancel(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function downloadDocs() {
    const count = downloadRequestFiles(request);
    setOpen(false);
    onToast?.(
      count > 1
        ? `Downloading ${count} documents`
        : count === 1
          ? "Downloading 1 document"
          : "No documents to download yet",
    );
  }

  function resendInvite() {
    upsertDocumentRequest({
      ...request,
      lastUpdated: nowStamp(),
      timeline: appendTimeline(request, {
        at: nowStamp(),
        by: request.requestedBy,
        label: "Invitation resent",
        detail: request.requestedFrom,
      }),
    });
    setOpen(false);
    onRefresh?.();
    onToast?.(`Invitation resent to ${request.requestedFrom}`);
  }

  function cancelRequest() {
    upsertDocumentRequest({
      ...request,
      status: "Expired",
      progress: 0,
      lastUpdated: nowStamp(),
      timeline: appendTimeline(request, {
        at: nowStamp(),
        by: request.requestedBy,
        label: "Request cancelled",
        detail: notifyCancel
          ? "Client notified by email. No further uploads are required."
          : "No further uploads are required from the client.",
      }),
    });
    setOpen(false);
    setConfirmCancel(false);
    setNotifyCancel(false);
    onRefresh?.();
    onToast?.(
      notifyCancel
        ? `Request cancelled · email sent to ${request.requestedFrom}`
        : "Request cancelled",
    );
  }

  return (
    <div ref={ref} className="relative flex justify-end">
      <div className="inline-flex overflow-hidden rounded-lg border border-[#E5E7EB]">
        <button
          type="button"
          aria-label="View request"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/documents/requests/${request.id}`);
          }}
          className="flex h-8 w-8 items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Actions"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
            setConfirmCancel(false);
            setNotifyCancel(false);
          }}
          className="flex h-8 w-8 items-center justify-center border-l border-[#E5E7EB] text-slate-400 hover:bg-slate-50 hover:text-slate-700"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
      {editingReminders ? (
        <EditRemindersModal
          request={request}
          onClose={() => setEditingReminders(false)}
          onSaved={() => {
            setEditingReminders(false);
            onRefresh?.();
            onToast?.("Reminders updated");
          }}
        />
      ) : null}
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
          {confirmCancel ? (
            <div className="px-3 py-2">
              <p className="text-[12px] leading-snug text-slate-600">
                Cancel this request? The client will no longer need to upload.
              </p>
              <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-[12px] text-slate-700">
                <input
                  type="checkbox"
                  checked={notifyCancel}
                  onChange={(e) => setNotifyCancel(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#5A32A3]"
                />
                Notify client
                <span
                  className="relative inline-flex"
                  title="notify client via email"
                >
                  <Info className="h-3 w-3 text-slate-400" />
                </span>
              </label>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  className="h-7 rounded-md bg-rose-600 px-2.5 text-[11px] font-semibold text-white"
                  onClick={cancelRequest}
                >
                  Cancel request
                </button>
                <button
                  type="button"
                  className="h-7 rounded-md px-2 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                  onClick={() => setConfirmCancel(false)}
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={!hasFiles}
                className="w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-[#F3ECFB] hover:text-[#5A32A3] disabled:opacity-40"
                onClick={downloadDocs}
              >
                Download documents
              </button>
              <button
                type="button"
                disabled={closed}
                className="w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-[#F3ECFB] hover:text-[#5A32A3] disabled:opacity-40"
                onClick={resendInvite}
              >
                Resend invitation link
              </button>
              <button
                type="button"
                disabled={closed}
                className="w-full px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-[#F3ECFB] hover:text-[#5A32A3] disabled:opacity-40"
                onClick={() => {
                  setOpen(false);
                  setEditingReminders(true);
                }}
              >
                Edit reminders
              </button>
              <button
                type="button"
                disabled={closed}
                className="w-full px-3 py-2 text-left text-[13px] text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                onClick={() => setConfirmCancel(true)}
              >
                Cancel request
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

interface DocumentRequestsListProps {
  data: DocumentRequest[];
  embedded?: boolean;
  viewMode?: "list" | "grid";
  fill?: boolean;
  framed?: boolean;
  showSelect?: boolean;
  showRelatedTo?: boolean;
  limit?: number;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onRefresh?: () => void;
  sort?: DocumentSortKey;
  onSortChange?: (sort: DocumentSortKey) => void;
}

export function DocumentRequestsList({
  data,
  viewMode = "list",
  fill = false,
  framed = true,
  showSelect = true,
  showRelatedTo = true,
  limit,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onRefresh,
  sort: sortProp,
  onSortChange,
}: DocumentRequestsListProps) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [localSort, setLocalSort] = useState<DocumentSortKey>(
    sortProp ?? "updated-desc",
  );
  const sort = sortProp ?? localSort;

  function changeSort(next: DocumentSortKey) {
    if (onSortChange) onSortChange(next);
    else setLocalSort(next);
  }

  const sorted = useMemo(
    () => sortDocumentRequests(data, sort),
    [data, sort],
  );
  const visible = limit ? sorted.slice(0, limit) : sorted;

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }
  const allSelected = visible.length > 0 && selectedIds.length === visible.length;

  if (viewMode === "grid") {
    return (
      <div
        className={cn(
          "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3",
          fill && "h-full min-h-0 overflow-y-auto",
        )}
      >
        {visible.map((request) => (
          <div key={request.id} className="relative">
            {onToggleSelect ? (
              <input
                type="checkbox"
                checked={selectedIds.includes(request.id)}
                onChange={() => onToggleSelect(request.id)}
                className="absolute top-3 right-3 z-10 h-4 w-4 rounded border-slate-300"
                aria-label={`Select ${request.requestedFrom}`}
              />
            ) : null}
            <DocumentRequestCard request={request} />
          </div>
        ))}
        {visible.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
            No document requests match your filters
          </div>
        ) : null}
      </div>
    );
  }

  const colCount = 8 + (showSelect ? 1 : 0) + (showRelatedTo ? 1 : 0);

  return (
    <div
      className={cn(
        "overflow-hidden bg-white",
        framed && "rounded-xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
        fill && "flex h-full min-h-0 flex-col",
      )}
    >
      <div className={cn("min-w-0", fill && "min-h-0 flex-1 overflow-y-auto overflow-x-hidden")}>
      <table className="w-full table-fixed border-collapse text-left">
        <colgroup>
          {showSelect ? <col className="w-9" /> : null}
          <col className="w-[22%]" />
          <col className="w-[14%]" />
          <col className="w-[12%]" />
          {showRelatedTo ? <col className="w-[12%]" /> : null}
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[7%]" />
          <col className="w-[72px]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-[#F8FAFC]">
          <tr className="border-b border-[#E5E7EB] text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            {showSelect ? (
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Select all requests"
                  className="h-4 w-4 rounded border-slate-300"
                />
              </th>
            ) : null}
            <th className="px-4 py-3 font-semibold">Applicant</th>
            <th className="px-3 py-3 font-semibold">Requested by</th>
            <th className="px-3 py-3 font-semibold">Request ID</th>
            {showRelatedTo ? (
              <th className="px-3 py-3 font-semibold">Related to</th>
            ) : null}
            <th className="px-3 py-3 font-semibold">
              <SortHeader
                label="Start date"
                active={sort === "started-desc" || sort === "started-asc"}
                direction={sort === "started-asc" ? "asc" : "desc"}
                onClick={() => changeSort(nextDocumentSort(sort, "started"))}
              />
            </th>
            <th className="px-3 py-3 font-semibold">
              <SortHeader
                label="Last updated"
                active={sort === "updated-desc" || sort === "updated-asc"}
                direction={sort === "updated-asc" ? "asc" : "desc"}
                onClick={() => changeSort(nextDocumentSort(sort, "updated"))}
              />
            </th>
            <th className="px-3 py-3 font-semibold">
              <SortHeader
                label="Status"
                active={sort === "status-asc" || sort === "status-desc"}
                direction={sort === "status-desc" ? "desc" : "asc"}
                onClick={() => changeSort(nextDocumentSort(sort, "status"))}
              />
            </th>
            <th className="px-2 py-3 text-center font-semibold">Progress</th>
            <th className="px-3 py-3 text-right font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => {
            const applicant = r.requestedFrom.split(",")[0]?.trim() || r.requestedFrom;
            const status = displayRequestStatus(r);
            return (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-[#F3F4F6] last:border-0 transition-colors hover:bg-slate-50/80"
                  onClick={() => router.push(`/documents/requests/${r.id}`)}
                >
                  {showSelect ? (
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => onToggleSelect?.(r.id)}
                        aria-label={`Select ${r.requestedFrom}`}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                          avatarSolid(applicant),
                        )}
                      >
                        {initials(applicant)}
                      </span>
                      <div className="min-w-0">
                        <p
                          className="truncate text-[13px] font-semibold text-slate-900"
                          title={r.requestedFrom}
                        >
                          {r.requestedFrom}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {r.documentType}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3" title={r.requestedBy}>
                    <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-slate-800">
                      <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{r.requestedBy}</span>
                    </p>
                  </td>
                  <td className="px-3 py-3" title={r.requestId}>
                    <p className="flex min-w-0 items-center gap-1.5 font-mono text-[12px] text-slate-600">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{r.requestId}</span>
                    </p>
                  </td>
                  {showRelatedTo ? (
                    <td className="px-3 py-3" title={r.relatedTo}>
                      <p className="truncate text-[13px] text-slate-700">
                        {r.relatedTo || "—"}
                      </p>
                    </td>
                  ) : null}
                  <td className="px-3 py-3">
                    <DateCell value={r.requestedDate} />
                  </td>
                  <td className="px-3 py-3">
                    <DateCell value={r.lastUpdated} />
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        status.pill,
                      )}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex justify-center">
                      <ProgressRing value={r.progress} />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      request={r}
                      onRefresh={onRefresh}
                      onToast={flash}
                    />
                  </td>
                </tr>
            );
          })}
          {visible.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-5 py-16 text-center">
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
      {toast ? (
        <div className="fixed right-4 bottom-4 z-50 rounded-xl bg-emerald-700 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
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
      <p className="truncate pr-7 text-[13px] font-semibold text-slate-900">
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

export { TYPE_SOFT };
