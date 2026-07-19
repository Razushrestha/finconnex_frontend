"use client";

import type { Message, MessageStatus } from "@/lib/messages/types";
import { messages } from "@/lib/messages/types";

const statusStyles: Record<MessageStatus, string> = {
  Sent: "bg-blue-50 text-blue-600",
  Delivered: "bg-indigo-50 text-indigo-600",
  Read: "bg-emerald-50 text-emerald-600",
  Failed: "bg-rose-50 text-rose-600",
};

const channelStyles: Record<Message["channel"], string> = {
  SMS: "bg-slate-100 text-slate-600",
  WhatsApp: "bg-emerald-50 text-emerald-600",
  Email: "bg-amber-50 text-amber-600",
  Chat: "bg-violet-50 text-violet-600",
};

interface MessagesListTableProps {
  data?: Message[];
}

export function MessagesListTable({ data = messages }: MessagesListTableProps) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white">
      {/* Internal scroll wrapper — owns its own scrolling, independent of parent */}
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
        <table className="w-full min-w-[840px] border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              {[
                "Related To",
                "Sender",
                "Message",
                "Channel",
                "Direction",
                "Timestamp",
                "Status",
              ].map((heading) => (
                <th
                  key={heading}
                  className="border-b border-slate-200 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((message) => (
              <tr key={message.id} className="group hover:bg-slate-50">
                <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-800">
                  {message.relatedTo}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                  {message.sender}
                </td>
                <td className="max-w-[280px] truncate border-b border-slate-100 px-4 py-3 text-slate-600">
                  {message.subject ? (
                    <span className="mr-1 font-medium text-slate-700">
                      {message.subject}:
                    </span>
                  ) : null}
                  {message.content}
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${channelStyles[message.channel]}`}
                  >
                    {message.channel}
                  </span>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${
                      message.direction === "Incoming"
                        ? "text-slate-500"
                        : "text-slate-700"
                    }`}
                  >
                    {message.direction === "Incoming" ? "↓" : "↑"}{" "}
                    {message.direction}
                  </span>
                </td>
                <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-500">
                  {message.timestamp}
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[message.status]}`}
                  >
                    {message.status}
                  </span>
                </td>
              </tr>
            ))}

            {data.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  No messages found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
