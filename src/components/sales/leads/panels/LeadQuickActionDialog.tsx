"use client";

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
import { ExternalLink, Phone, Mail, MessageSquare, X } from "lucide-react";

const TITLES: Record<QuickActionKind, string> = {
  call: "Call",
  sms: "SMS",
  email: "Email",
  meeting: "Schedule appointment",
  task: "Create task",
  note: "Add note",
  attachment: "Upload attachment",
};

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

  function update<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
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

  const needsSchedule = kind === "call" || kind === "meeting" || kind === "task";
  const needsBody =
    kind === "sms" || kind === "email" || kind === "note" || kind === "attachment";
  const isContactIntent =
    kind === "call" || kind === "sms" || kind === "email";
  const titleLabel =
    kind === "attachment"
      ? "File name"
      : kind === "sms" || kind === "note"
        ? "Subject (optional)"
        : kind === "call"
          ? "Log subject (optional)"
          : "Title";

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
              className="w-full justify-center gap-2"
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 py-4">
          <label className="block text-xs font-medium text-slate-600">
            {titleLabel}
            <input
              autoFocus={!isContactIntent}
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
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
              <textarea
                value={draft.body}
                onChange={(e) => update("body", e.target.value)}
                rows={3}
                className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder={
                  kind === "sms"
                    ? "Write a text…"
                    : kind === "email"
                      ? "Email body…"
                      : kind === "attachment"
                        ? "What was uploaded…"
                        : "Add a note…"
                }
              />
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
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Time
                <input
                  type="time"
                  value={draft.time}
                  onChange={(e) => update("time", e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
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
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
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
                onChange={(e) =>
                  update("priority", e.target.value as Priority)
                }
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
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
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
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
