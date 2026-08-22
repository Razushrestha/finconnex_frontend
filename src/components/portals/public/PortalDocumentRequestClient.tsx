"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  MessageSquare,
  Upload,
} from "lucide-react";
import { usePortalContext } from "@/components/portals/public/PortalShell";
import {
  getDocumentRequestById,
  upsertDocumentRequest,
  type DocumentRequest,
  type RequestedDocLine,
} from "@/lib/documents/requests/types";
import {
  DOC_STATUS_LABEL,
  DOC_STATUS_PILL,
  appendMessage,
  appendTimeline,
  applyItemChange,
  cacheRequestFile,
  nowStamp,
  patchItem,
  requestItems,
} from "@/lib/documents/requests/pack";
import { cn } from "@/lib/utils";

export function PortalDocumentRequestClient({
  slug,
  requestId,
}: {
  slug: string;
  requestId: string;
}) {
  const { portal, logActivity, canWrite, isReadOnly } = usePortalContext(slug);
  const [request, setRequest] = useState<DocumentRequest | null>(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const uploadFor = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRequest(getDocumentRequestById(requestId) ?? null);
  }, [requestId]);

  useEffect(() => {
    if (!portal || !request) return;
    logActivity(`Opened document request ${request.requestId}`);
    if (request.status !== "Requested") return;
    const today = nowStamp();
    const next = {
      ...request,
      status: "Pending" as const,
      progress: Math.max(request.progress, 12),
      lastUpdated: today,
      timeline: appendTimeline(request, {
        at: today,
        by: portal.primaryContactName,
        label: "Opened",
        detail: `${portal.primaryContactName} opened the invitation`,
      }),
    };
    upsertDocumentRequest(next);
    setRequest(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal?.id, request?.id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }

  function persist(next: DocumentRequest, msg: string) {
    upsertDocumentRequest(next);
    setRequest(next);
    flash(msg);
  }

  function actor() {
    return portal?.primaryContactName ?? request?.requestedFrom ?? "Client";
  }

  function openUpload(itemId: string) {
    if (!canWrite || isReadOnly) return;
    uploadFor.current = itemId;
    fileInputRef.current?.click();
  }

  function onFilePicked(file: File | undefined) {
    if (!request || !file || !uploadFor.current) return;
    const itemId = uploadFor.current;
    const item = requestItems(request).find((row) => row.id === itemId);
    if (!item) return;
    const cached = cacheRequestFile(request.id, itemId, file);
    const today = nowStamp();
    const nextItems = patchItem(request, itemId, {
      status: "Uploaded",
      fileName: cached.name,
      fileKind: cached.kind,
      uploadedAt: today,
      uploadedBy: actor(),
      source: "portal",
      rejectionReason: undefined,
      rejectedAt: undefined,
    });
    persist(
      applyItemChange(request, nextItems, {
        timeline: appendTimeline(request, {
          at: today,
          by: actor(),
          label: `${item.title} submitted`,
          detail: cached.name,
        }),
      }),
      `${item.title} uploaded`,
    );
    uploadFor.current = null;
  }

  function toggleUnavailable(item: RequestedDocLine, checked: boolean) {
    if (!request || !canWrite || isReadOnly) return;
    const today = nowStamp();
    const nextItems = patchItem(request, item.id, {
      status: checked ? "Unavailable" : "Awaiting",
      fileName: checked ? undefined : item.fileName,
    });
    persist(
      applyItemChange(request, nextItems, {
        timeline: appendTimeline(request, {
          at: today,
          by: actor(),
          label: checked
            ? `${item.title} marked as not available`
            : `${item.title} set back to awaiting`,
        }),
      }),
      checked ? "We’ll follow up on this document" : "Document is awaiting upload",
    );
  }

  function sendNote() {
    if (!request || !note.trim() || !canWrite || isReadOnly) return;
    const today = nowStamp();
    const text = note.trim();
    setNote("");
    persist(
      {
        ...request,
        messages: appendMessage(request, {
          at: today,
          by: actor(),
          from: "client",
          text,
        }),
        timeline: appendTimeline(request, {
          at: today,
          by: actor(),
          label: "Message from client",
          detail: text,
        }),
      },
      "Note sent to your broker",
    );
  }

  if (!portal) return null;

  if (!request) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
        <FileText className="mx-auto h-8 w-8 text-slate-300" />
        <h2 className="mt-3 text-[15px] font-bold text-slate-900">
          Request not found
        </h2>
        <Link
          href={`/p/${slug}/documents`}
          className="mt-4 inline-flex h-8 items-center rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
        >
          Back to documents
        </Link>
      </div>
    );
  }

  const items = requestItems(request);
  const messages = request.messages ?? [];

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          onFilePicked(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <Link
        href={`/p/${slug}/documents`}
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-violet-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Documents
      </Link>
      <h2 className="text-xl font-bold tracking-tight text-slate-900">
        {request.title}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {request.requestId} · Due {request.dueDate}
      </p>
      {request.notes ? (
        <p className="mt-3 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5 text-[12px] text-violet-900">
          {request.notes}
        </p>
      ) : null}

      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    {item.description}
                  </p>
                ) : null}
                {item.fileName ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Uploaded: {item.fileName}
                  </p>
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
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-800">
                Rejected: {item.rejectionReason}
              </p>
            ) : null}
            {item.status === "Accepted" ? (
              <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Accepted — no further action needed
              </p>
            ) : null}
            {canWrite && !isReadOnly && item.status !== "Accepted" ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openUpload(item.id)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {item.fileName ? "Replace file" : "Upload file"}
                </button>
                <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={item.status === "Unavailable"}
                    onChange={(e) =>
                      toggleUnavailable(item, e.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 accent-[#5A32A3]"
                  />
                  I don’t have this document
                </label>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="text-[13px] font-bold text-slate-900">Notes</h3>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Messages go straight to your broker so they can respond.
        </p>
        <div className="mt-3 space-y-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-lg px-3 py-2 text-[12px]",
                m.from === "client" ? "bg-violet-50" : "bg-slate-50",
              )}
            >
              <p className="font-semibold text-slate-800">
                {m.from === "client" ? "You" : m.by}
              </p>
              <p className="mt-0.5 text-slate-700">{m.text}</p>
              <p className="mt-1 text-[10px] text-slate-400">{m.at}</p>
            </div>
          ))}
        </div>
        {canWrite && !isReadOnly ? (
          <div className="mt-3 flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for your broker…"
              className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400"
            />
            <button
              type="button"
              onClick={sendNote}
              disabled={!note.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white disabled:opacity-40"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
        ) : null}
      </div>

      {toast ? (
        <div className="fixed right-4 bottom-4 z-50 rounded-xl bg-emerald-700 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
