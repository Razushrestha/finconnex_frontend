"use client";

import { CalendarClock, Mail, MessageSquare, Repeat, UserRound } from "lucide-react";
import type { RequestDocItem } from "@/lib/documents/requests/catalog";
import type { RequestNotifyMethod } from "@/components/documents/requests/RequestScheduleCard";

export interface ReviewDocGroup {
  applicant: string;
  items: RequestDocItem[];
}

function ReviewRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof CalendarClock;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#5A32A3] shadow-sm">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          {label}
        </p>
        <p className="truncate text-[13px] font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export function RequestQuickReview({
  clientName,
  sendOnBehalfOf,
  requestTitle,
  onRequestTitleChange,
  groups,
  dueDate,
  reminderDate,
  repeatLabel,
  notifyBy,
  notes,
  onNotesChange,
}: {
  clientName: string;
  sendOnBehalfOf: string;
  requestTitle: string;
  onRequestTitleChange: (value: string) => void;
  groups: ReviewDocGroup[];
  dueDate: string;
  reminderDate: string;
  repeatLabel: string;
  notifyBy: RequestNotifyMethod[];
  notes: string;
  onNotesChange: (value: string) => void;
}) {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(90,50,163,0.08)] sm:p-6">
      <h2 className="shrink-0 text-[20px] font-bold tracking-tight text-slate-900">
        Quick review
      </h2>
      <p className="mt-1 shrink-0 text-[13px] text-slate-500">
        Document request to{" "}
        <span className="font-semibold text-[#5A32A3]">{clientName}</span>
      </p>

      <label className="mt-4 shrink-0 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        Document request title
      </label>
      <input
        value={requestTitle}
        onChange={(e) => onRequestTitleChange(e.target.value)}
        placeholder="Template name - First client, Second client"
        className="mt-1 h-10 w-full shrink-0 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-[13px] font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#5A32A3]/45 focus:bg-white focus:ring-2 focus:ring-[#5A32A3]/12"
      />
      <p className="mt-1 shrink-0 text-[11px] text-slate-400">
        Fills automatically from the template and client first names. You can
        edit it.
      </p>

      <div className="mt-4 grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <ReviewRow label="Client" value={clientName} icon={UserRound} />
        <ReviewRow
          label="Send on behalf of"
          value={sendOnBehalfOf || "—"}
          icon={UserRound}
        />
        <ReviewRow label="Due date" value={dueDate} icon={CalendarClock} />
        <ReviewRow
          label="Reminder date"
          value={reminderDate}
          icon={CalendarClock}
        />
        <ReviewRow
          label="Notify via"
          value={notifyBy.length ? notifyBy.join(", ") : "—"}
          icon={
            notifyBy.includes("SMS") && !notifyBy.includes("Email")
              ? MessageSquare
              : Mail
          }
        />
        <ReviewRow
          label="Repeat"
          value={repeatLabel}
          icon={Repeat}
        />
      </div>

      <div className="mt-4">
        <div className="flex items-end justify-between gap-3">
          <h3 className="text-[14px] font-bold text-slate-900">
            Documents requested
          </h3>
          <span className="text-[12px] font-medium text-slate-400">
            {total} {total === 1 ? "document" : "documents"}
          </span>
        </div>

        <div className="mt-2">
          <div className="grid grid-cols-1 content-start gap-3 md:grid-cols-2">
            {groups.map((group) => (
              <div
                key={group.applicant}
                className="rounded-xl border border-slate-200"
              >
                <div className="border-b border-slate-100 bg-[#F8F4FC] px-3 py-1.5">
                  <p className="text-[13px] font-semibold text-[#5A32A3]">
                    {group.applicant}
                  </p>
                </div>
                <ol className="space-y-1 px-3 py-2.5">
                  {group.items.map((item, index) => (
                    <li
                      key={item.id}
                      className="flex gap-2 text-[13px] text-slate-800"
                    >
                      <span className="w-5 shrink-0 font-semibold text-slate-500">
                        {index + 1}.
                      </span>
                      <span className="min-w-0">{item.title}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 shrink-0">
        <label className="mb-1 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          Notes for the client
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add a note the client will see with this request…"
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#5A32A3]/45 focus:bg-white focus:ring-2 focus:ring-[#5A32A3]/12"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          This note is visible to the client.
        </p>
      </div>
    </section>
  );
}
