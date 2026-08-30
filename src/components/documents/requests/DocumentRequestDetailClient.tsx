"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MentionTextarea } from "@/components/shared/MentionTextarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
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
  Eye,
  Download,
  MessageSquare,
  Repeat,
  Mail,
  Pencil,
  Info,
} from "lucide-react";
import {
  getDocumentRequestById,
  upsertDocumentRequest,
  type DocumentRequest,
  type DocumentRequestStatus,
  type RequestedDocLine,
} from "@/lib/documents/requests/types";
import {
  getCrmDocumentRequest,
  isCrmDocumentRequestId,
  syncCrmDocumentRequestStatus,
  toCreateDocumentRequestBody,
  tryCrmDocumentRequest,
  updateCrmDocumentRequest,
} from "@/lib/documents/requests/api";
import { pushLibraryDoc } from "@/lib/documents/library/types";
import {
  displayRequestStatus,
  isOverdueRequest,
} from "@/lib/documents/requests/dashboard";
import {
  DOC_STATUS_LABEL,
  DOC_STATUS_PILL,
  appendMessage,
  appendTimeline,
  applyItemChange,
  cacheRequestFile,
  downloadRequestFiles,
  getCachedRequestFile,
  interactionTimeline,
  nowStamp,
  patchItem,
  requestItems,
  triggerDownload,
  uploadedItems,
} from "@/lib/documents/requests/pack";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";
import { RejectDocumentModal } from "@/components/documents/requests/RejectDocumentModal";
import { ViewDocumentModal } from "@/components/documents/requests/ViewDocumentModal";
import { EditRemindersModal } from "@/components/documents/requests/EditRemindersModal";

const DETAIL_PIPELINE: {
  status: DocumentRequestStatus;
  label: string;
}[] = [
  { status: "Requested", label: "Invite sent" },
  { status: "Pending", label: "Opened" },
  { status: "Received", label: "In progress" },
  { status: "Approved", label: "Completed" },
];

function pipelineIndex(status: DocumentRequestStatus) {
  if (status === "Approved") return 3;
  if (status === "Received") return 2;
  if (status === "Pending") return 1;
  if (status === "Requested") return 0;
  return -1;
}

export function DocumentRequestDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [request, setRequest] = useState<DocumentRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [reply, setReply] = useState("");
  const [rejecting, setRejecting] = useState<RequestedDocLine | null>(null);
  const [viewing, setViewing] = useState<RequestedDocLine | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [notifyCancel, setNotifyCancel] = useState(false);
  const [editingReminders, setEditingReminders] = useState(false);
  const uploadFor = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const local = getDocumentRequestById(id) ?? null;
    setRequest(local);
    setInternalNotes(local?.internalNotes ?? "");
    if (!isCrmDocumentRequestId(id)) return;
    let cancelled = false;
    void (async () => {
      const remote = await tryCrmDocumentRequest(() => getCrmDocumentRequest(id));
      if (cancelled || !remote) return;
      const merged = {
        ...local,
        ...remote,
        items: remote.items ?? local?.items,
        timeline: local?.timeline ?? remote.timeline,
        messages: local?.messages ?? remote.messages,
        internalNotes: local?.internalNotes ?? remote.notes,
      };
      upsertDocumentRequest(merged);
      setRequest(merged);
      setInternalNotes(merged.internalNotes ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("created") !== "1") return;
    setJustCreated(true);
    window.history.replaceState({}, "", window.location.pathname);
    const hideBanner = window.setTimeout(() => setJustCreated(false), 3000);
    return () => {
      window.clearTimeout(hideBanner);
    };
  }, []);

  const items = useMemo(
    () => (request ? requestItems(request) : []),
    [request],
  );
  const files = useMemo(
    () => (request ? uploadedItems(request) : []),
    [request],
  );

  const statusIndex = request ? pipelineIndex(request.status) : 0;

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }

  function save(
    next: DocumentRequest,
    msg?: string,
    options?: { patch?: boolean },
  ) {
    upsertDocumentRequest(next);
    setRequest(next);
    if (options?.patch !== false && isCrmDocumentRequestId(next.id)) {
      void tryCrmDocumentRequest(() =>
        updateCrmDocumentRequest(next.id, toCreateDocumentRequestBody(next)),
      );
    }
    if (msg) flash(msg);
  }

  function setStatus(status: DocumentRequestStatus) {
    if (!request) return;
    const today = nowStamp();
    const progress =
      status === "Approved"
        ? 100
        : status === "Received"
          ? 86
          : status === "Pending"
            ? Math.max(request.progress, 32)
            : status === "Rejected"
              ? Math.max(request.progress, 45)
              : status === "Requested" || status === "Expired"
                ? 0
                : request.progress;
    save(
      {
        ...request,
        status,
        internalNotes,
        progress,
        lastUpdated: today,
        timeline: appendTimeline(request, {
          at: today,
          by: request.requestedBy,
          label: `Status → ${status}`,
        }),
      },
      `Status → ${status}`,
      { patch: false },
    );
    if (isCrmDocumentRequestId(request.id)) {
      void tryCrmDocumentRequest(() =>
        syncCrmDocumentRequestStatus(request.id, status),
      );
    }
  }

  function sendReminder() {
    if (!request) return;
    save(
      {
        ...request,
        timeline: appendTimeline(request, {
          at: nowStamp(),
          by: request.requestedBy,
          label: "Invitation resent",
          detail: request.requestedFrom,
        }),
      },
      `Invitation resent to ${request.requestedFrom}`,
    );
  }

  function cancelRequest() {
    if (!request) return;
    const today = nowStamp();
    save(
      {
        ...request,
        status: "Expired",
        progress: 0,
        lastUpdated: today,
        internalNotes,
        timeline: appendTimeline(request, {
          at: today,
          by: request.requestedBy,
          label: "Request cancelled",
          detail: notifyCancel
            ? "Client notified by email. No further uploads are required."
            : "No further uploads are required from the client.",
        }),
        messages: notifyCancel
          ? appendMessage(request, {
              at: today,
              by: request.requestedBy,
              from: "team",
              text: "This document request has been cancelled.",
            })
          : request.messages,
      },
      notifyCancel
        ? `Request cancelled · email sent to ${request.requestedFrom}`
        : "Request cancelled",
      { patch: false },
    );
    if (isCrmDocumentRequestId(request.id)) {
      void tryCrmDocumentRequest(() =>
        syncCrmDocumentRequestStatus(request.id, "Expired"),
      );
    }
    setConfirmCancel(false);
    setNotifyCancel(false);
  }

  function openUpload(itemId: string) {
    uploadFor.current = itemId;
    fileInputRef.current?.click();
  }

  function onFilePicked(file: File | undefined) {
    if (!request || !file || !uploadFor.current) return;
    const itemId = uploadFor.current;
    const item = items.find((row) => row.id === itemId);
    if (!item) return;
    const cached = cacheRequestFile(request.id, itemId, file);
    const today = nowStamp();
    const nextItems = patchItem(request, itemId, {
      status: "Uploaded",
      fileName: cached.name,
      fileKind: cached.kind,
      uploadedAt: today,
      uploadedBy: request.requestedBy,
      source: "whatsapp",
      rejectionReason: undefined,
      rejectedAt: undefined,
    });
    save(
      applyItemChange(request, nextItems, {
        timeline: appendTimeline(request, {
          at: today,
          by: request.requestedBy,
          label: `${item.title} submitted`,
          detail: `${cached.name} (manual / WhatsApp)`,
        }),
      }),
      `Uploaded ${cached.name}`,
    );
    uploadFor.current = null;
  }

  function acceptItem(item: RequestedDocLine) {
    if (!request || !item.fileName) return;
    const today = nowStamp();
    const nextItems = patchItem(request, item.id, {
      status: "Accepted",
      acceptedAt: today,
    });
    pushLibraryDoc({
      id: `lib-from-${request.id}-${item.id}`,
      fileName: item.fileName,
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
    save(
      applyItemChange(request, nextItems, {
        timeline: appendTimeline(request, {
          at: today,
          by: request.requestedBy,
          label: `${item.title} approved`,
        }),
      }),
      `${item.title} accepted`,
    );
  }

  function rejectItem(
    item: RequestedDocLine,
    reason: string,
    notifyClient: boolean,
  ) {
    if (!request) return;
    const today = nowStamp();
    const nextItems = patchItem(request, item.id, {
      status: "Rejected",
      rejectionReason: reason,
      rejectedAt: today,
    });
    save(
      applyItemChange(request, nextItems, {
        timeline: appendTimeline(request, {
          at: today,
          by: request.requestedBy,
          label: `${item.title} rejected`,
          detail: notifyClient
            ? `${reason} · Client notified by email`
            : reason,
        }),
        messages: notifyClient
          ? appendMessage(request, {
              at: today,
              by: request.requestedBy,
              from: "team",
              text: `Rejected “${item.title}”: ${reason}`,
              documentId: item.id,
            })
          : request.messages,
      }),
      notifyClient
        ? `Rejected · email sent to ${request.requestedFrom}`
        : `${item.title} rejected`,
    );
    setRejecting(null);
  }

  function downloadItem(item: RequestedDocLine) {
    if (!item.fileName) return;
    const cached = getCachedRequestFile(request?.id ?? "", item.id);
    triggerDownload(item.fileName, cached?.url);
    flash(`Downloading ${item.fileName}`);
  }

  function bulkDownload() {
    if (!request) return;
    const count = downloadRequestFiles(request);
    flash(
      count > 1
        ? `Downloading ${count} documents`
        : count === 1
          ? "Downloading 1 document"
          : "No files to download",
    );
  }

  function sendReply() {
    if (!request || !reply.trim()) return;
    const today = nowStamp();
    const text = reply.trim();
    setReply("");
    save(
      {
        ...request,
        messages: appendMessage(request, {
          at: today,
          by: request.requestedBy,
          from: "team",
          text,
        }),
        timeline: appendTimeline(request, {
          at: today,
          by: request.requestedBy,
          label: "Reply sent to client",
          detail: text,
        }),
      },
      "Reply sent to the client portal",
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

  const display = displayRequestStatus(request);
  const overdue = isOverdueRequest(request);
  const isRejected = request.status === "Rejected";
  const isCancelled = request.status === "Expired";
  const isClosed = request.status === "Approved" || isRejected || isCancelled;
  const messages = request.messages ?? [];
  const timeline = interactionTimeline(request);

  return (
    <div className="relative flex min-h-full flex-col bg-slate-50">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          onFilePicked(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="relative flex flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
        {justCreated ? (
          <div className="mb-2.5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-emerald-900">
                Your document request has been created successfully.
              </p>
              <p className="mt-0.5 text-[12px] text-emerald-800/80">
                {request.requestedFrom} can now see this request in their client
                portal.
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setJustCreated(false)}
              className="ml-auto shrink-0 text-emerald-700/70 hover:text-emerald-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <button
            type="button"
            onClick={() => router.push("/documents/requests")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            aria-label="Back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <h1 className="text-[15px] font-bold text-slate-900">
            {request.requestId}
          </h1>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              display.pill,
            )}
          >
            {display.label}
          </span>
          {overdue ? (
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              Overdue
            </span>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border bg-white p-2.5 text-[10px] font-semibold",
                overdue
                  ? "border-rose-200 text-rose-700"
                  : "border-slate-200 text-slate-600",
              )}
            >
              <Calendar
                className={cn("h-3 w-3", overdue ? "text-rose-500" : "text-slate-400")}
              />
              Due {request.dueDate}
            </span>
            {files.length > 0 ? (
              <button
                type="button"
                onClick={bulkDownload}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                Download all
              </button>
            ) : null}
            {!isClosed ? (
              <>
                <button
                  type="button"
                  onClick={sendReminder}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700"
                >
                  <Bell className="h-3.5 w-3.5" />
                  Resend invitation
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNotifyCancel(false);
                    setConfirmCancel(true);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel request
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-0">
              {DETAIL_PIPELINE.map((step, i) => {
                const exception = isRejected || isCancelled;
                const active = !exception && request.status === step.status;
                const past = !exception && statusIndex > i;
                return (
                  <button
                    key={step.status}
                    type="button"
                    onClick={() => setStatus(step.status)}
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
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors",
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
                            i === DETAIL_PIPELINE.length - 1
                              ? "bg-transparent"
                              : past
                                ? "bg-violet-400"
                                : "bg-slate-100",
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          "truncate text-[12px] font-semibold",
                          active
                            ? "text-violet-700"
                            : past
                              ? "text-slate-600"
                              : "text-slate-400",
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_300px]">
            <div className="flex min-h-0 flex-col overflow-y-auto border-b border-slate-100 lg:border-r lg:border-b-0">
              <div className="border-b border-slate-100 px-4 py-4 sm:px-5 sm:py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-[22px]">
                      {request.title}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[12px] text-slate-400">
                        Requested {request.requestedDate}
                      </span>
                      {overdue ? (
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Overdue
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2">
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

              <div className="grid border-b border-slate-100 sm:grid-cols-2 xl:grid-cols-4">
                <MetaCell
                  icon={User}
                  label="Requested from"
                  value={request.requestedFrom}
                />
                <MetaCell
                  icon={Link2}
                  label="Related to"
                  value={request.relatedTo ?? ""}
                />
                <MetaCell
                  icon={Calendar}
                  label="Requested date"
                  value={request.requestedDate}
                />
                <MetaCell
                  icon={Clock}
                  label="Received date"
                  value={request.receivedDate ?? ""}
                  muted={!request.receivedDate}
                />
              </div>

              <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Documents
                </p>
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <DocumentTimelineCard
                      key={item.id}
                      item={item}
                      closed={isClosed}
                      onView={() => setViewing(item)}
                      onAccept={() => acceptItem(item)}
                      onReject={() => setRejecting(item)}
                      onUpload={() => openUpload(item.id)}
                      onDownload={() => downloadItem(item)}
                    />
                  ))}
                </div>
              </div>

              <div className="px-4 py-4 sm:px-5">
                <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Timeline
                </p>
                <ol className="relative">
                  {timeline.map((e, i) => (
                    <li
                      key={e.id}
                      className="relative flex gap-3 pb-5 last:pb-0"
                    >
                      {i < timeline.length - 1 ? (
                        <span
                          aria-hidden
                          className="absolute top-3 left-[5px] h-[calc(100%-4px)] w-px bg-slate-200"
                        />
                      ) : null}
                      <span
                        className={cn(
                          "relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4",
                          /reject/i.test(e.label)
                            ? "bg-rose-500 ring-rose-50"
                            : /approved|accept/i.test(e.label)
                              ? "bg-emerald-500 ring-emerald-50"
                              : /message|reply/i.test(e.label)
                                ? "bg-amber-500 ring-amber-50"
                                : "bg-violet-500 ring-violet-50",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-slate-900">
                          {e.label}
                        </p>
                        {e.detail ? (
                          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600">
                            {e.detail}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-slate-400">
                          {e.by}
                          <span className="mx-1">·</span>
                          {e.at}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <aside className="flex min-h-0 flex-col overflow-y-auto bg-slate-50/70 p-4 sm:p-5">
              <div className="mb-5 rounded-xl border border-slate-200/80 bg-white px-3 py-3">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Reminders
                  </p>
                  {!isClosed ? (
                    <button
                      type="button"
                      onClick={() => setEditingReminders(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 hover:underline"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  ) : null}
                </div>
                <dl className="space-y-2.5">
                  <ReminderRow
                    icon={Calendar}
                    label="Reminder date"
                    value={request.reminderDate || "No reminder scheduled"}
                    muted={!request.reminderDate}
                  />
                  <ReminderRow
                    icon={Repeat}
                    label="Repeat"
                    value={request.repeat || "Off"}
                    muted={!request.repeat}
                  />
                  <ReminderRow
                    icon={
                      request.notifyBy?.includes("SMS") &&
                      !request.notifyBy?.includes("Email")
                        ? MessageSquare
                        : Mail
                    }
                    label="Notify by"
                    value={
                      request.notifyBy?.length
                        ? request.notifyBy.join(", ")
                        : "—"
                    }
                    muted={!request.notifyBy?.length}
                  />
                </dl>
              </div>

              {isRejected ? (
                <div className="mb-4 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                  <p className="text-[11px] leading-relaxed text-rose-900/80">
                    This request was rejected as an exception.
                  </p>
                </div>
              ) : null}

              {isCancelled ? (
                <div className="mb-4 flex gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    This request is cancelled / closed.
                  </p>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Internal notes
                </p>
                <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white focus-within:border-violet-400 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]">
                  <MentionTextarea
                    value={internalNotes}
                    onChange={setInternalNotes}
                    onBlur={() => save({ ...request, internalNotes })}
                    className="min-h-[88px] resize-none bg-transparent px-3 py-2.5 text-[12px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
                    placeholder="Team notes only. Type @ to mention."
                  />
                </div>
              </div>

              <div className="mt-5 flex min-h-0 flex-1 flex-col">
                <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Client messages
                </p>
                <div className="flex min-h-[140px] flex-1 flex-col rounded-xl border border-slate-200/80 bg-white">
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                    {request.notes ? (
                      <p className="rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
                        Note sent with request: {request.notes}
                      </p>
                    ) : null}
                    {messages.length === 0 && !request.notes ? (
                      <p className="text-[11px] text-slate-400">
                        Client notes from the portal appear here so you can
                        respond.
                      </p>
                    ) : null}
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "rounded-lg px-2.5 py-2",
                          m.from === "client"
                            ? "bg-violet-50"
                            : "bg-slate-50",
                        )}
                      >
                        <p className="text-[11px] font-semibold text-slate-800">
                          {m.from === "client" ? m.by : "You"}
                        </p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-slate-700">
                          {m.text}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">{m.at}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 p-2">
                    <div className="flex gap-2">
                      <input
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Reply to the client…"
                        className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 text-[12px] outline-none focus:border-violet-400"
                      />
                      <button
                        type="button"
                        onClick={sendReply}
                        disabled={!reply.trim()}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-[11px] font-semibold text-white disabled:opacity-40"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {editingReminders ? (
        <EditRemindersModal
          request={request}
          onClose={() => setEditingReminders(false)}
          onSaved={(next) => {
            setRequest(next);
            setEditingReminders(false);
            flash("Reminders updated");
          }}
        />
      ) : null}

      {confirmCancel ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          onClick={() => setConfirmCancel(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-request-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[400px] rounded-2xl bg-white px-6 py-5 shadow-xl"
          >
            <h2
              id="cancel-request-title"
              className="text-[18px] font-bold text-slate-900"
            >
              Cancel request
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
              This request will be cancelled / closed. The client will no
              longer need to upload documents.
            </p>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
              <input
                type="checkbox"
                checked={notifyCancel}
                onChange={(e) => setNotifyCancel(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-[#5A32A3]"
              />
              Notify client
              <span
                className="relative inline-flex"
                title="notify client via email"
              >
                <span className="peer flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Info className="h-3 w-3" />
                </span>
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden w-max -translate-x-1/2 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-white shadow-sm peer-hover:block">
                  notify client via email
                </span>
              </span>
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmCancel(false);
                  setNotifyCancel(false);
                }}
                className="h-10 rounded-lg border border-slate-300 bg-white px-5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50"
              >
                Keep request
              </button>
              <button
                type="button"
                onClick={cancelRequest}
                className="h-10 rounded-lg bg-rose-600 px-5 text-[13px] font-semibold text-white hover:bg-rose-700"
              >
                Cancel request
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rejecting ? (
        <RejectDocumentModal
          title={rejecting.title}
          onClose={() => setRejecting(null)}
          onConfirm={(reason, notifyClient) =>
            rejectItem(rejecting, reason, notifyClient)
          }
        />
      ) : null}
      {viewing ? (
        <ViewDocumentModal
          requestId={request.id}
          item={viewing}
          onClose={() => setViewing(null)}
          onDownload={() => downloadItem(viewing)}
        />
      ) : null}

      {toast ? (
        <div className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function DocumentTimelineCard({
  item,
  closed,
  onView,
  onAccept,
  onReject,
  onUpload,
  onDownload,
}: {
  item: RequestedDocLine;
  closed: boolean;
  onView: () => void;
  onAccept: () => void;
  onReject: () => void;
  onUpload: () => void;
  onDownload: () => void;
}) {
  const hasFile = Boolean(item.fileName);
  const canReview = hasFile && item.status === "Uploaded" && !closed;

  return (
    <div className="min-w-0 flex-1 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-900">{item.title}</p>
          {item.applicant ? (
            <p className="mt-0.5 text-[11px] text-slate-400">{item.applicant}</p>
          ) : null}
          {item.fileName ? (
            <p className="mt-0.5 text-[11px] text-slate-500">{item.fileName}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            DOC_STATUS_PILL[item.status],
          )}
        >
          {DOC_STATUS_LABEL[item.status]}
        </span>
      </div>
      {item.status === "Rejected" && item.rejectionReason ? (
        <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] text-rose-800">
          Reason sent to client: {item.rejectionReason}
        </p>
      ) : null}
      {item.status === "Unavailable" ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-900">
          Client marked that they do not have this document.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <IconBtn
          icon={Eye}
          label="Review"
          disabled={!hasFile}
          onClick={onView}
        />
        <IconBtn
          icon={Check}
          label="Accept"
          tone="success"
          disabled={!canReview}
          onClick={onAccept}
        />
        <IconBtn
          icon={X}
          label="Reject"
          tone="danger"
          disabled={!canReview}
          onClick={onReject}
        />
        <IconBtn
          icon={Upload}
          label="Upload"
          disabled={closed || item.status === "Accepted"}
          onClick={onUpload}
        />
        <IconBtn
          icon={Download}
          label="Download"
          disabled={!hasFile}
          onClick={onDownload}
        />
      </div>
    </div>
  );
}

function IconBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "success" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-semibold disabled:opacity-35",
        tone === "success"
          ? "bg-emerald-600 text-white hover:bg-emerald-700"
          : tone === "danger"
            ? "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function ReminderRow({
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
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
      <div className="min-w-0">
        <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          {label}
        </dt>
        <dd
          className={cn(
            "text-[12px] leading-snug font-medium",
            muted ? "text-slate-400" : "text-slate-800",
          )}
        >
          {value}
        </dd>
      </div>
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
