"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Bell,
  Check,
  X,
  Upload,
  FileText,
  ArrowLeft,
  Clock,
  User,
  Link2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  getDocumentRequestById,
  DOCUMENT_REQUEST_STATUSES,
  upsertDocumentRequest,
  type DocumentRequest,
  type DocumentRequestStatus,
} from "@/lib/documents/requests/types";
import { pushLibraryDoc } from "@/lib/documents/library/types";
import {
  STATUS_META,
  TYPE_SOFT,
} from "@/components/documents/requests/DocumentRequestsList";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

export function DocumentRequestDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [request, setRequest] = useState<DocumentRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const live = getDocumentRequestById(id) ?? null;
    setRequest(live);
    setNotes(live?.notes ?? "");
  }, [id]);

  const timeline = useMemo(() => {
    if (!request) return [];
    const events = [
      {
        id: "t1",
        label: "Request created",
        at: request.requestedDate,
        by: request.requestedBy,
      },
    ];
    if (request.receivedDate) {
      events.push({
        id: "t2",
        label: `Document received${request.receivedFileName ? `: ${request.receivedFileName}` : ""}`,
        at: request.receivedDate,
        by: request.requestedFrom,
      });
    }
    if (request.status === "Approved" || request.status === "Rejected") {
      events.push({
        id: "t3",
        label: `Marked ${request.status}`,
        at: request.receivedDate ?? request.requestedDate,
        by: request.requestedBy,
      });
    }
    if (request.status === "Expired") {
      events.push({
        id: "t4",
        label: "Request expired",
        at: request.dueDate,
        by: "System",
      });
    }
    return events;
  }, [request]);

  const statusIndex = request
    ? DOCUMENT_REQUEST_STATUSES.indexOf(request.status)
    : 0;

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }

  function save(next: DocumentRequest, msg?: string) {
    upsertDocumentRequest(next);
    setRequest(next);
    if (msg) flash(msg);
  }

  function setStatus(status: DocumentRequestStatus) {
    if (!request) return;
    const next = { ...request, status, notes };
    if (status === "Approved" && request.receivedFileName) {
      const today = new Date().toLocaleDateString("en-AU");
      pushLibraryDoc({
        id: `lib-from-${request.id}`,
        fileName: request.receivedFileName,
        folder: "Clients",
        owner: request.requestedBy,
        relatedTo: request.relatedTo,
        version: 1,
        tags: [
          request.documentType.toLowerCase().replace(/\s+/g, "-"),
          "from-request",
        ],
        uploadedAt: today,
        accessLevel: "Team",
        sizeLabel: "210 KB",
        versions: [
          {
            version: 1,
            uploadedAt: today,
            uploadedBy: request.requestedBy,
            sizeLabel: "210 KB",
            note: `Approved from ${request.requestId}`,
          },
        ],
      });
      save(next, "Approved · added to Library");
      return;
    }
    save(next, `Status → ${status}`);
  }

  function sendReminder() {
    flash(`Reminder sent to ${request?.requestedFrom}`);
  }

  function uploadReceived() {
    if (!request) return;
    const today = new Date().toLocaleDateString("en-AU");
    save(
      {
        ...request,
        status: "Received",
        receivedDate: today,
        receivedFileName: `${request.documentType.replace(/\s+/g, "_")}_upload.pdf`,
        notes,
      },
      "Document marked as received",
    );
  }

  if (!request) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-slate-50 p-8 text-center">
        <FileText className="mb-3 h-10 w-10 text-slate-300" />
        <h1 className="text-lg font-bold text-slate-900">Request not found</h1>
        <Link
          href="/documents/requests"
          className="mt-4 text-[12px] font-semibold text-violet-700 hover:underline"
        >
          Back to requests
        </Link>
      </div>
    );
  }

  const meta = STATUS_META[request.status];
  const canAct =
    request.status === "Requested" ||
    request.status === "Pending" ||
    request.status === "Received";
  const isClosed =
    request.status === "Approved" ||
    request.status === "Rejected" ||
    request.status === "Expired";

  return (
    <div className="relative flex min-h-full flex-col bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.09),_transparent_60%)]"
      />

      <div className="relative flex flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
        {/* Compact header */}
        <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <button
            type="button"
            onClick={() => router.push("/documents/requests")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            aria-label="Back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <nav className="flex items-center gap-1 text-[10px] text-slate-400">
            <Link
              href="/"
              className="flex items-center gap-0.5 hover:text-slate-600"
            >
              <Home className="h-3 w-3" />
              Home
            </Link>
            <span>/</span>
            <Link href="/documents/requests" className="hover:text-slate-600">
              Requests
            </Link>
            <span>/</span>
          </nav>
          <h1 className="text-[15px] font-bold text-slate-900">
            {request.requestId}
          </h1>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              meta.soft,
              meta.text,
            )}
          >
            {request.status}
          </span>
          <span className="hidden text-[11px] text-slate-400 sm:inline">·</span>
          <p className="hidden min-w-0 truncate text-[12px] font-medium text-slate-600 sm:block">
            {request.title}
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">
              <Calendar className="h-3 w-3 text-slate-400" />
              Due {request.dueDate}
            </span>
            {!isClosed ? (
              <button
                type="button"
                onClick={sendReminder}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700"
              >
                <Bell className="h-3.5 w-3.5" />
                Send reminder
              </button>
            ) : null}
          </div>
        </div>

        {/* One surface — fills remaining viewport */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {/* Status progress */}
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-0">
              {DOCUMENT_REQUEST_STATUSES.map((s, i) => {
                const active = request.status === s;
                const past = i < statusIndex;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className="group flex min-w-0 flex-1 items-center"
                  >
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      <div className="flex w-full items-center">
                        <div
                          className={cn(
                            "h-0.5 flex-1",
                            i === 0
                              ? "bg-transparent"
                              : past || active
                                ? "bg-violet-400"
                                : "bg-slate-100",
                          )}
                        />
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                            active
                              ? "bg-violet-600 text-white ring-4 ring-violet-100"
                              : past
                                ? "bg-violet-100 text-violet-700"
                                : "bg-slate-100 text-slate-400 group-hover:bg-slate-200",
                          )}
                        >
                          {past && !active ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            i + 1
                          )}
                        </span>
                        <div
                          className={cn(
                            "h-0.5 flex-1",
                            i === DOCUMENT_REQUEST_STATUSES.length - 1
                              ? "bg-transparent"
                              : past
                                ? "bg-violet-400"
                                : "bg-slate-100",
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          "truncate text-[10px] font-semibold",
                          active
                            ? "text-violet-700"
                            : past
                              ? "text-slate-600"
                              : "text-slate-400",
                        )}
                      >
                        {s}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_300px]">
            {/* Main */}
            <div className="flex min-h-0 flex-col border-b border-slate-100 lg:border-r lg:border-b-0">
              <div className="border-b border-slate-100 px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-[22px]">
                      {request.title}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          TYPE_SOFT[request.documentType],
                        )}
                      >
                        {request.documentType}
                      </span>
                      <span className="text-[12px] text-slate-400">
                        Requested {request.requestedDate}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold",
                        avatarColor(request.requestedBy),
                      )}
                    >
                      {initials(request.requestedBy)}
                    </span>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-800">
                        {request.requestedBy}
                      </p>
                      <p className="text-[10px] text-slate-400">Requested by</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meta grid */}
              <div className="grid border-b border-slate-100 sm:grid-cols-2 xl:grid-cols-4">
                <MetaCell
                  icon={User}
                  label="Requested from"
                  value={request.requestedFrom}
                />
                <MetaCell
                  icon={Link2}
                  label="Related to"
                  value={request.relatedTo ?? "—"}
                />
                <MetaCell
                  icon={Calendar}
                  label="Requested date"
                  value={request.requestedDate}
                />
                <MetaCell
                  icon={Clock}
                  label="Received date"
                  value={request.receivedDate ?? "—"}
                  muted={!request.receivedDate}
                />
              </div>

              {/* Document + notes — grow to fill */}
              <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-2">
                <section className="flex flex-col border-b border-slate-100 p-4 sm:p-5 lg:border-r lg:border-b-0">
                  <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Received document
                  </p>
                  {request.receivedFileName ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-8 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <FileText className="h-6 w-6" />
                      </div>
                      <p className="text-[13px] font-semibold text-emerald-950">
                        {request.receivedFileName}
                      </p>
                      <p className="mt-1 text-[11px] text-emerald-700/80">
                        Received {request.receivedDate}
                      </p>
                      <button
                        type="button"
                        onClick={() => flash("Download started (mock)")}
                        className="mt-4 text-[11px] font-semibold text-violet-700 hover:underline"
                      >
                        Download file
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={uploadReceived}
                      disabled={!canAct}
                      className="group flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center transition-colors hover:border-violet-300 hover:bg-violet-50/30 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-100 group-hover:text-violet-600">
                        <Upload className="h-5 w-5" />
                      </div>
                      <p className="text-[13px] font-semibold text-slate-800">
                        Upload received document
                      </p>
                      <p className="mt-1 max-w-[220px] text-[11px] text-slate-400">
                        Mark the client upload as received to unlock approve /
                        reject.
                      </p>
                    </button>
                  )}
                </section>

                <section className="flex flex-col p-4 sm:p-5">
                  <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Notes
                  </p>
                  <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/40 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus-within:border-violet-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onBlur={() => save({ ...request, notes })}
                      className="min-h-[140px] flex-1 resize-none bg-transparent px-3.5 py-3 text-[13px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
                      placeholder="Internal notes for the team…"
                    />
                  </div>
                </section>
              </div>

              {/* Timeline */}
              <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
                <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Timeline
                </p>
                <ol className="relative space-y-0">
                  {timeline.map((e, i) => (
                    <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < timeline.length - 1 ? (
                        <span
                          aria-hidden
                          className="absolute top-3 left-[5px] h-[calc(100%-4px)] w-px bg-slate-200"
                        />
                      ) : null}
                      <span className="relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500 ring-4 ring-violet-50" />
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-slate-800">
                          {e.label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {e.at} · {e.by}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Actions rail */}
            <aside className="flex flex-col bg-slate-50/70 p-4 sm:p-5">
              <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Actions
              </p>
              <div className="space-y-2">
                <ActionBtn
                  onClick={sendReminder}
                  icon={Bell}
                  label="Send reminder"
                  disabled={isClosed}
                />
                <ActionBtn
                  onClick={uploadReceived}
                  icon={Upload}
                  label="Upload received document"
                  disabled={!canAct || request.status === "Approved"}
                />
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <ActionBtn
                    onClick={() => setStatus("Approved")}
                    icon={Check}
                    label="Approve"
                    tone="success"
                    disabled={request.status !== "Received"}
                  />
                  <ActionBtn
                    onClick={() => setStatus("Rejected")}
                    icon={X}
                    label="Reject"
                    tone="danger"
                    disabled={request.status !== "Received"}
                  />
                </div>
                <ActionBtn
                  onClick={() => setStatus("Pending")}
                  icon={Clock}
                  label="Mark pending"
                  disabled={request.status !== "Requested"}
                />
              </div>

              {request.status === "Received" ? (
                <div className="mt-4 flex gap-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <p className="text-[11px] leading-relaxed text-amber-900/80">
                    Document is ready for review. Approve to add it to the
                    Library.
                  </p>
                </div>
              ) : null}

              <div className="mt-auto space-y-4 pt-6">
                <div>
                  <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Quick status
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {DOCUMENT_REQUEST_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={cn(
                          "rounded-md px-2 py-1 text-[10px] font-semibold transition-colors",
                          request.status === s
                            ? "bg-violet-600 text-white"
                            : "bg-white text-slate-500 ring-1 ring-slate-200/80 hover:bg-slate-100",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-3">
                  <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Summary
                  </p>
                  <dl className="mt-2 space-y-1.5 text-[11px]">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-400">ID</dt>
                      <dd className="font-semibold text-slate-800">
                        {request.requestId}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-400">Type</dt>
                      <dd className="font-medium text-slate-700">
                        {request.documentType}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-400">Due</dt>
                      <dd className="font-medium text-slate-700">
                        {request.dueDate}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-400">From</dt>
                      <dd className="truncate font-medium text-slate-700">
                        {request.requestedFrom}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {toast ? (
        <div className="fixed right-4 bottom-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function MetaCell({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="border-b border-slate-100 px-4 py-3.5 sm:border-r sm:px-5 sm:[&:nth-child(2n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2n)]:border-r xl:[&:last-child]:border-r-0">
      <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p
        className={cn(
          "truncate text-[13px] font-semibold",
          muted ? "text-slate-400" : "text-slate-900",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ActionBtn({
  onClick,
  icon: Icon,
  label,
  disabled,
  tone,
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
  tone?: "success" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-35",
        tone === "success"
          ? "bg-emerald-600 text-white hover:bg-emerald-700"
          : tone === "danger"
            ? "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
            : "border border-slate-200 bg-white text-slate-700 hover:bg-white hover:shadow-sm",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
