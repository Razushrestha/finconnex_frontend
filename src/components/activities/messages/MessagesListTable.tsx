"use client";

import { useEffect, useMemo, useState } from "react";
import type { Message, MessageStatus, MessageType } from "@/lib/messages/types";
import { listMessages } from "@/lib/messages/store";
import { RecordDetailModal } from "@/components/shared/RecordDetailModal";

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

export function MessagesListTable({ data }: MessagesListTableProps) {
  const [detail, setDetail] = useState<Message | null>(null);
  const rows = useMemo(() => data ?? listMessages(), [data]);

  useEffect(() => {
    const focus = new URLSearchParams(window.location.search).get("focus");
    if (!focus) return;
    const hit = rows.find((m) => m.id === focus);
    if (hit) setDetail(hit);
  }, [rows]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white">
      <div className="min-h-0 flex-1 overflow-auto">
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
                <td className="border-b border-slate-100 px-3 py-2.5 font-semibold text-slate-900">
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
      </div>

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
              ]
            : []
        }
        body={detail?.body}
      />
    </div>
  );
}
