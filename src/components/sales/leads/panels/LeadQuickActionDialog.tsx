"use client";

import { MentionTextarea } from "@/components/shared/MentionTextarea";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { getSendGateway } from "@/lib/comms/send-gateway";
import {
  defaultQuickActionDraft,
  leadCreateHref,
  submitLeadQuickAction,
  type QuickActionKind,
} from "@/lib/leads/panel-actions";
import type { Priority } from "@/lib/tasks/types";
import Link from "next/link";
import {
  ExternalLink,
  Phone,
  Mail,
  MessageSquare,
  X,
  ChevronDown,
  Paperclip,
  StickyNote,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TITLES: Record<QuickActionKind, string> = {
  call: "Call",
  sms: "SMS",
  email: "Email",
  meeting: "Schedule appointment",
  task: "Create task",
  note: "Add note",
  attachment: "Upload attachment",
};

// TODO(api): replace with a real fetch, e.g.
//   listLeadActivities(leadId, kind) from a future @/lib/leads/activity-store
interface PastRecordEntry {
  id: string;
  title: string;
  snippet?: string;
  timestamp: string;
  status?: "Sent" | "Failed" | "Draft" | "Open" | "Done";
  owner?: string;
}

const MOCK_PAST_RECORDS: Partial<Record<QuickActionKind, PastRecordEntry[]>> = {
  sms: [
    {
      id: "sms-1",
      title: "Follow-up reminder",
      snippet: "Hi, just checking in on the rate lock paperwork…",
      timestamp: "Jul 24, 2026 · 3:12 PM",
      status: "Sent",
      owner: "Priya Shrestha",
    },
    {
      id: "sms-2",
      title: "Appointment confirmation",
      snippet: "Confirming our call tomorrow at 10am.",
      timestamp: "Jul 18, 2026 · 11:05 AM",
      status: "Sent",
      owner: "Priya Shrestha",
    },
  ],
  email: [
    {
      id: "email-1",
      title: "Pre-approval next steps",
      snippet: "Attached the checklist for your pre-approval application…",
      timestamp: "Jul 22, 2026 · 9:40 AM",
      status: "Sent",
      owner: "Priya Shrestha",
    },
  ],
  task: [
    {
      id: "task-1",
      title: "Send disclosure documents",
      timestamp: "Due Jul 30, 2026",
      status: "Open",
      owner: "Priya Shrestha",
    },
    {
      id: "task-2",
      title: "Confirm income verification",
      timestamp: "Completed Jul 20, 2026",
      status: "Done",
      owner: "Priya Shrestha",
    },
  ],
  note: [
    {
      id: "note-1",
      title: "Call recap",
      snippet:
        "Client is comparing rates with two other lenders, wants to close by end of Q3.",
      timestamp: "Jul 21, 2026 · 4:50 PM",
      owner: "Priya Shrestha",
    },
  ],
  attachment: [
    {
      id: "attach-1",
      title: "rate-lock.pdf",
      timestamp: "Jul 19, 2026 · 2:15 PM",
      owner: "Priya Shrestha",
    },
    {
      id: "attach-2",
      title: "income-verification.pdf",
      timestamp: "Jul 12, 2026 · 10:30 AM",
      owner: "Priya Shrestha",
    },
  ],
};

const HISTORY_ICONS: Partial<Record<QuickActionKind, typeof Mail>> = {
  sms: MessageSquare,
  email: Mail,
  task: CheckSquare,
  note: StickyNote,
  attachment: Paperclip,
};

const STATUS_STYLES: Record<NonNullable<PastRecordEntry["status"]>, string> = {
  Sent: "bg-emerald-50 text-emerald-700",
  Failed: "bg-rose-50 text-rose-700",
  Draft: "bg-slate-100 text-slate-600",
  Open: "bg-amber-50 text-amber-700",
  Done: "bg-emerald-50 text-emerald-700",
};

function PastRecordsList({ kind }: { kind: QuickActionKind }) {
  const records = MOCK_PAST_RECORDS[kind] ?? [];

  if (records.length === 0) {
    return (
      <p className="px-5 py-6 text-center text-xs text-slate-400">
        No past {TITLES[kind].toLowerCase()} activity yet.
      </p>
    );
  }

  return (
    <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto">
      {records.map((r) => (
        <li key={r.id} className="flex items-start gap-2.5 px-5 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[13px] font-semibold text-slate-800">
                {r.title}
              </p>
              {r.status && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    STATUS_STYLES[r.status],
                  )}
                >
                  {r.status}
                </span>
              )}
            </div>
            {r.snippet && (
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {r.snippet}
              </p>
            )}
            <p className="mt-1 text-[11px] text-slate-400">
              {r.timestamp}
              {r.owner ? ` · ${r.owner}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface LeadQuickActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: QuickActionKind;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  onSuccess?: (message: string) => void;
}

export function LeadQuickActionDialog({
  open,
  onOpenChange,
  kind,
  leadName,
  leadEmail,
  leadPhone,
  onSuccess,
}: LeadQuickActionDialogProps) {
  const [draft, setDraft] = useState(() => defaultQuickActionDraft(kind));
  const [error, setError] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  function update<K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await submitLeadQuickAction(kind, leadName, draft, {
      leadEmail,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onOpenChange(false);
    onSuccess?.(result.message);
  }

  async function runIntent() {
    setIntentError(null);
    const gateway = getSendGateway();
    if (kind === "call") {
      const r = await gateway.placeCall({ phone: leadPhone });
      if (!r.ok) setIntentError(r.message);
      return;
    }
    if (kind === "sms") {
      const r = await gateway.sendSms({
        phone: leadPhone,
        body: draft.body || draft.title,
      });
      if (!r.ok) setIntentError(r.message);
      return;
    }
    if (kind === "email") {
      const r = await gateway.sendEmail({
        email: leadEmail,
        subject: draft.title,
        body: draft.body,
      });
      if (!r.ok) setIntentError(r.message);
    }
  }

  const fullFormHref = leadCreateHref(kind, leadName, {
    email: leadEmail,
    phone: leadPhone,
  });

  const needsSchedule =
    kind === "call" || kind === "meeting" || kind === "task";
  const needsBody =
    kind === "sms" ||
    kind === "email" ||
    kind === "note" ||
    kind === "attachment";
  const isContactIntent = kind === "call" || kind === "sms" || kind === "email";
  const titleLabel =
    kind === "attachment"
      ? "File name"
      : kind === "sms" || kind === "note"
        ? "Subject (optional)"
        : kind === "call"
          ? "Log subject (optional)"
          : "Title";

  const showsHistory = kind !== "call";
  const HistoryIcon = HISTORY_ICONS[kind];
  const historyCount = MOCK_PAST_RECORDS[kind]?.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md"
      >
        <DialogTitle className="sr-only">{TITLES[kind]}</DialogTitle>
        <DialogDescription className="sr-only">
          {isContactIntent
            ? `Open ${TITLES[kind].toLowerCase()} for lead ${leadName}, or log the activity in CRM.`
            : `Create a ${TITLES[kind].toLowerCase()} related to lead ${leadName}.`}
        </DialogDescription>
        <div className="flex items-center justify-between px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              {TITLES[kind]}
            </h2>
            <p className="truncate text-xs text-slate-500">
              Lead: {leadName}
              {(kind === "call" || kind === "sms") && leadPhone
                ? ` · ${leadPhone}`
                : ""}
              {kind === "email" && leadEmail ? ` · ${leadEmail}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={`Close ${TITLES[kind]} dialog`}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-t border-slate-100" />

        {isContactIntent && (
          <div className="space-y-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <p className="text-[11px] font-medium text-slate-500">
              Open on this device
            </p>
            <Button
              type="button"
              className="w-full justify-center gap-2 bg-violet-600 text-white hover:bg-violet-700"
              onClick={runIntent}
            >
              {kind === "call" && <Phone className="h-4 w-4" />}
              {kind === "sms" && <MessageSquare className="h-4 w-4" />}
              {kind === "email" && <Mail className="h-4 w-4" />}
              {kind === "call"
                ? "Call now"
                : kind === "sms"
                  ? "Open SMS app"
                  : "Open email app"}
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </Button>
            {intentError && (
              <p className="text-xs text-red-600" role="alert">
                {intentError}
              </p>
            )}
            <p className="text-[10px] text-slate-400">
              Or log the activity below so it appears on the Lead Card timeline.
            </p>
          </div>
        )}

        {showsHistory && (
          <div className="border-b border-slate-100">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-2.5 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                {HistoryIcon && (
                  <HistoryIcon className="h-3.5 w-3.5 text-slate-400" />
                )}
                Past {TITLES[kind].toLowerCase()}
                {historyCount > 0 && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    {historyCount}
                  </span>
                )}
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-slate-400 transition-transform",
                  historyOpen && "rotate-180",
                )}
              />
            </button>
            {historyOpen && <PastRecordsList kind={kind} />}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 py-4">
          <label className="block text-xs font-medium text-slate-600">
            {titleLabel}
            <input
              autoFocus={!isContactIntent}
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              placeholder={
                kind === "call"
                  ? "Discovery call"
                  : kind === "attachment"
                    ? "rate-lock.pdf"
                    : "Subject"
              }
            />
          </label>

          {needsBody && (
            <label className="block text-xs font-medium text-slate-600">
              {kind === "note"
                ? "Note"
                : kind === "attachment"
                  ? "Notes (optional)"
                  : "Message"}
              {kind === "note" || kind === "attachment" ? (
                <MentionTextarea
                  value={draft.body}
                  onChange={(body) => update("body", body)}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  placeholder={
                    kind === "attachment"
                      ? "What was uploaded… Type @ to assign someone."
                      : "Add a note… Type @ to assign someone."
                  }
                />
              ) : (
                <textarea
                  value={draft.body}
                  onChange={(e) => update("body", e.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  placeholder={
                    kind === "sms"
                      ? "Write a text…"
                      : "Email body…"
                  }
                />
              )}
            </label>
          )}

          {needsSchedule && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-medium text-slate-600">
                Date
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => update("date", e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Time
                <input
                  type="time"
                  value={draft.time}
                  onChange={(e) => update("time", e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </label>
            </div>
          )}

          {(kind === "call" || kind === "meeting" || kind === "task") && (
            <label className="block text-xs font-medium text-slate-600">
              Assigned to
              <select
                value={draft.assignedTo}
                onChange={(e) => update("assignedTo", e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              >
                {ACTIVITY_OWNERS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          )}

          {kind === "task" && (
            <label className="block text-xs font-medium text-slate-600">
              Priority
              <select
                value={draft.priority}
                onChange={(e) => update("priority", e.target.value as Priority)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </label>
          )}

          {error && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Link
              href={fullFormHref}
              className="text-[11px] font-medium text-violet-600 hover:underline"
              onClick={() => onOpenChange(false)}
            >
              Open full form
            </Link>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-200 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-violet-600 text-white hover:bg-violet-700"
              >
                {kind === "sms" || kind === "email"
                  ? "Log as sent"
                  : kind === "note"
                    ? "Save note"
                    : kind === "attachment"
                      ? "Upload"
                      : kind === "call"
                        ? "Log call"
                        : "Save"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
