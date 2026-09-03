"use client";

import { useEffect, useState } from "react";
import { Ban, Paperclip, RotateCcw, Send, Trash2 } from "lucide-react";
import type { Message, MessageStatus, MessageType } from "@/lib/messages/types";
import { cardSubject } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { deleteMessage, listMessages } from "@/lib/messages/store";
import {
  attachCrmMessageObject,
  cancelCrmMessage,
  deleteCrmMessage,
  deleteCrmMessageAttachment,
  downloadCrmMessageAttachment,
  getCrmMessage,
  isCrmMessageId,
  persistRemoteMessage,
  retryCrmMessage,
  sendCrmMessage,
  tryCrmMessage,
} from "@/lib/messages/api";
import { RecordDetailModal } from "@/components/shared/RecordDetailModal";
import { onRulesChange } from "@/lib/rules";
import { ResizableColumns } from "@/components/common/ResizableColumns";

const statusStyles: Record<MessageStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Sent: "bg-blue-50 text-blue-600",
  Delivered: "bg-indigo-50 text-indigo-600",
  Read: "bg-emerald-50 text-emerald-600",
  Failed: "bg-rose-50 text-rose-600",
};

const typeStyles: Record<MessageType, string> = {
  Internal: "bg-violet-50 text-violet-700",
  External: "bg-sky-50 text-sky-700",
  System: "bg-amber-50 text-amber-700",
};

interface MessagesListTableProps {
  data?: Message[];
}

const actionBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 disabled:opacity-50";

export function MessagesListTable({ data }: MessagesListTableProps) {
  const [detail, setDetail] = useState<Message | null>(null);
  const [rows, setRows] = useState(() => data ?? listMessages());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  useEffect(() => {
    return onRulesChange(() => setRows(data ?? listMessages()));
  }, [data]);

  useEffect(() => {
    const focus = new URLSearchParams(window.location.search).get("focus");
    if (!focus) return;
    const hit = rows.find((m) => m.id === focus);
    if (hit) setDetail(hit);
  }, [rows]);

  useEffect(() => {
    if (!detail || !isCrmMessageId(detail.id)) return;
    void tryCrmMessage(() => getCrmMessage(detail.id)).then((remote) => {
      if (remote) {
        persistRemoteMessage(remote);
        setDetail(remote);
      }
    });
  }, [detail?.id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  async function runAction(
    action: () => Promise<Message | null>,
    okMsg: string,
  ) {
    if (!detail || busy) return;
    setBusy(true);
    const remote = await tryCrmMessage(action);
    if (remote) {
      persistRemoteMessage(remote);
      setDetail(remote);
      flash(okMsg);
    } else {
      flash("CRM action failed");
    }
    setBusy(false);
  }

  async function onDownload(attachmentId: string, name: string) {
    if (!detail) return;
    const blob = await tryCrmMessage(() =>
      downloadCrmMessageAttachment(detail.id, attachmentId),
    );
    if (!blob) {
      flash("Download failed");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name || "attachment";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onAttach() {
    if (!detail) return;
    const storageKey = window.prompt("Workspace storage key");
    if (!storageKey?.trim()) return;
    const fileName = window.prompt("File name", "attachment.pdf") ?? "attachment.pdf";
    setBusy(true);
    const attached = await tryCrmMessage(() =>
      attachCrmMessageObject(detail.id, {
        storageKey: storageKey.trim(),
        fileName,
      }),
    );
    const remote = await tryCrmMessage(() => getCrmMessage(detail.id));
    if (remote) {
      persistRemoteMessage(remote);
      setDetail(remote);
    }
    flash(attached ? "Attachment added" : "Attach failed");
    setBusy(false);
  }

  async function onDeleteAttachment(attachmentId: string) {
    if (!detail) return;
    setBusy(true);
    await tryCrmMessage(() =>
      deleteCrmMessageAttachment(detail.id, attachmentId),
    );
    const remote = await tryCrmMessage(() => getCrmMessage(detail.id));
    if (remote) {
      persistRemoteMessage(remote);
      setDetail(remote);
      flash("Attachment removed");
    } else {
      flash("Remove failed");
    }
    setBusy(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white">
      {toast ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
      <ResizableColumns
        storageKey="messages-list"
        className="min-h-0 flex-1 overflow-auto"
      >
        <table className="w-full min-w-[900px] border-separate border-spacing-0 text-[12px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              {[
                "Type",
                "Subject",
                "Body",
                "From",
                "To",
                "Related To",
                "Status",
                "Sent",
              ].map((heading) => (
                <th
                  key={heading}
                  data-col-id={heading}
                  className="border-b border-slate-200 bg-slate-50/90 px-3 py-2.5 text-left text-[11px] font-medium tracking-wide text-slate-400 uppercase"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((message) => (
              <tr
                key={message.id}
                data-focus-id={message.id}
                data-message-id={message.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => setDetail(message)}
              >
                <td className="border-b border-slate-100 px-3 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeStyles[message.type]}`}
                  >
                    {message.type}
                  </span>
                </td>
                <td
                  className={cn(
                    "border-b border-slate-100 px-3 py-2.5 font-normal text-slate-900",
                    cardSubject,
                  )}
                >
                  {message.subject}
                </td>
                <td className="max-w-[220px] truncate border-b border-slate-100 px-3 py-2.5 text-slate-600">
                  {message.body}
                </td>
                <td className="border-b border-slate-100 px-3 py-2.5 text-slate-600">
                  {message.from}
                </td>
                <td className="border-b border-slate-100 px-3 py-2.5 text-slate-600">
                  {message.to}
                </td>
                <td className="border-b border-slate-100 px-3 py-2.5 text-slate-500">
                  {message.relatedTo || ""}
                </td>
                <td className="border-b border-slate-100 px-3 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyles[message.status]}`}
                  >
                    {message.status}
                  </span>
                </td>
                <td className="border-b border-slate-100 px-3 py-2.5 whitespace-nowrap text-slate-500">
                  {message.sentDate || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResizableColumns>

      <RecordDetailModal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.subject ?? "Message"}
        subtitle={detail?.status}
        fields={
          detail
            ? [
                { label: "Type", value: detail.type },
                { label: "From", value: detail.from },
                { label: "To", value: detail.to },
                { label: "Related to", value: detail.relatedTo ?? "" },
                { label: "Status", value: detail.status },
                { label: "Sent", value: detail.sentDate ?? "" },
                {
                  label: "Attachments",
                  value:
                    detail.attachments?.length
                      ? detail.attachments.map((a) => a.name).join(", ")
                      : "",
                },
              ]
            : []
        }
        body={detail?.body}
        actions={
          detail ? (
            <>
              {detail.status === "Draft" ? (
                <button
                  type="button"
                  disabled={busy}
                  className={cn(actionBtn, "border-violet-200 bg-violet-50 text-violet-800")}
                  onClick={() =>
                    void runAction(() => sendCrmMessage(detail.id), "Queued")
                  }
                >
                  <Send className="h-3.5 w-3.5" /> Send
                </button>
              ) : null}
              {detail.status === "Failed" ? (
                <button
                  type="button"
                  disabled={busy}
                  className={cn(actionBtn, "border-amber-200 bg-amber-50 text-amber-800")}
                  onClick={() =>
                    void runAction(() => retryCrmMessage(detail.id), "Retry queued")
                  }
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Retry
                </button>
              ) : null}
              {detail.status === "Sent" ? (
                <button
                  type="button"
                  disabled={busy}
                  className={actionBtn}
                  onClick={() =>
                    void runAction(() => cancelCrmMessage(detail.id), "Cancelled")
                  }
                >
                  <Ban className="h-3.5 w-3.5" /> Cancel
                </button>
              ) : null}
              {detail.status === "Draft" ? (
                <button
                  type="button"
                  disabled={busy}
                  className={actionBtn}
                  onClick={() => void onAttach()}
                >
                  <Paperclip className="h-3.5 w-3.5" /> Attach
                </button>
              ) : null}
              {(detail.attachments ?? []).map((file) => (
                <button
                  key={file.id}
                  type="button"
                  disabled={busy}
                  className={actionBtn}
                  onClick={() => void onDownload(file.id, file.name)}
                >
                  {file.name}
                </button>
              ))}
              {detail.status === "Draft"
                ? (detail.attachments ?? []).map((file) => (
                    <button
                      key={`del-${file.id}`}
                      type="button"
                      disabled={busy}
                      className={cn(actionBtn, "text-rose-600")}
                      onClick={() => void onDeleteAttachment(file.id)}
                    >
                      Remove {file.name}
                    </button>
                  ))
                : null}
              <button
                type="button"
                disabled={busy}
                className={cn(actionBtn, "text-rose-600")}
                onClick={() => {
                  if (!window.confirm(`Delete ${detail.subject || "this message"}?`)) {
                    return;
                  }
                  void (async () => {
                    setBusy(true);
                    await tryCrmMessage(() => deleteCrmMessage(detail.id));
                    deleteMessage(detail.id);
                    setDetail(null);
                    setBusy(false);
                    flash("Deleted");
                  })();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </>
          ) : null
        }
      />
    </div>
  );
}
