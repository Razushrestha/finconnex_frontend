"use client";

import type { Email, EmailStatus } from "@/lib/emails/types";
import { emails } from "@/lib/emails/types";
import { Paperclip } from "lucide-react";

const statusStyles: Record<EmailStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Scheduled: "bg-amber-50 text-amber-600",
  Sent: "bg-blue-50 text-blue-600",
  Delivered: "bg-indigo-50 text-indigo-600",
  Opened: "bg-emerald-50 text-emerald-600",
  Bounced: "bg-orange-50 text-orange-600",
  Failed: "bg-rose-50 text-rose-600",
};

const columns = [
  { key: "subject", label: "Subject" },
  { key: "from", label: "From" },
  { key: "to", label: "To" },
  { key: "relatedTo", label: "Related To" },
  { key: "templateUsed", label: "Template Used" },
  { key: "sentDate", label: "Sent Date" },
  { key: "openedDate", label: "Opened Date" },
  { key: "status", label: "Status" },
] as const;

interface EmailListTableProps {
  data?: Email[];
}

export function EmailListTable({ data = emails }: EmailListTableProps) {
  return (
    <div className="flex h-full w-full min-w-0 flex-col rounded-2xl border border-slate-100 bg-white">
      {/* Internal scroll wrapper — owns its own scroll, independent of parent */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
        <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="sticky left-0 z-30 w-10 bg-white px-4 py-2.5">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-300"
                />
              </th>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-2.5 font-medium">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.map((email) => (
              <tr
                key={email.id}
                className="group border-b border-slate-50 last:border-b-0 hover:bg-slate-50/60"
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-3 group-hover:bg-slate-50/60">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-300"
                  />
                </td>
                <td className="max-w-[260px] px-4 py-3">
                  <div className="flex items-center gap-1.5 truncate font-medium text-slate-800">
                    {email.subject}
                  </div>
                  <p className="mt-0.5 max-w-[240px] truncate text-xs text-slate-400">
                    {email.body}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {email.from}
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-slate-600">
                  {email.to.join(", ")}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {email.relatedTo ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                  {email.templateUsed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-600">
                      <Paperclip className="h-3 w-3" />
                      {email.templateUsed}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                  {email.sentDate ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                  {email.openedDate ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[email.status]}`}
                  >
                    {email.status}
                  </span>
                </td>
              </tr>
            ))}

            {data.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  No emails found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
