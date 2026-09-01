"use client";

import { useEffect, useState } from "react";
import { Calendar, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createCall,
  findCallById,
  formatCallDate,
  updateCall,
} from "@/lib/calls/store";
import { CALL_PURPOSES, CALL_STAGES, type CallStatus } from "@/lib/calls/types";
import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";
import type { LeadCardData } from "@/lib/leads/types";
import {
  createMeeting,
  findMeetingById,
  formatMeetingDateTime,
  updateMeeting,
} from "@/lib/meetings/store";
import {
  MEETING_STATUSES,
  MEETING_TYPES,
  type MeetingStatus,
} from "@/lib/meetings/types";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { SearchablePersonSelect } from "@/components/shared/SearchablePersonSelect";
import { LeadScheduleMeetingModal } from "@/components/sales/leads/detail/LeadScheduleMeetingModal";
import { cn } from "@/lib/utils";

const PURPLE = "#5A32A3";
const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#5A32A3] focus:outline-none focus:ring-2 focus:ring-[#5A32A3]/20";
const labelClass = "mb-1 block text-[12px] font-medium text-slate-600";

export type ScheduleKind = "call" | "meeting";

export type ScheduleDraft = {
  id: string;
  title: string;
  subtitle?: string;
  at: Date;
  owner: string;
};

function toDatetimeLocalValue(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function LeadActivityScheduleModal({
  open,
  kind,
  card,
  onClose,
  onSaved,
  editId = null,
  draft = null,
}: {
  open: boolean;
  kind: ScheduleKind;
  card: LeadCardData;
  onClose: () => void;
  onSaved?: (replacedSeedId?: string) => void;
  editId?: string | null;
  draft?: ScheduleDraft | null;
}) {
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [owner, setOwner] = useState(card.owner);
  const [notes, setNotes] = useState("");
  const [purpose, setPurpose] = useState("");
  const [callStatus, setCallStatus] = useState<CallStatus>("Scheduled");
  const [meetingStatus, setMeetingStatus] = useState<MeetingStatus>("Scheduled");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const editing = Boolean(editId || draft);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSaving(false);

    if (kind === "call" && editId) {
      const live = findCallById(editId)?.call;
      if (live) {
        const at = parseFlexibleDate(live.date);
        setTitle(live.subject);
        setWhen(at ? toDatetimeLocalValue(at) : "");
        setOwner(live.assignedTo || card.owner);
        setNotes(live.agenda ?? live.notes ?? "");
        setPurpose(live.purpose ?? "");
        setCallStatus(live.status);
        return;
      }
    }

    if (kind === "meeting" && editId) {
      const live = findMeetingById(editId)?.meeting;
      if (live) {
        const at = parseFlexibleDate(live.startDateTime);
        setTitle(live.title);
        setWhen(at ? toDatetimeLocalValue(at) : "");
        setOwner(live.organizer || card.owner);
        setNotes(live.notes ?? live.agenda ?? "");
        setPurpose("");
        setMeetingStatus(live.status);
        return;
      }
    }

    if (draft) {
      setTitle(draft.title);
      setWhen(toDatetimeLocalValue(draft.at));
      setOwner(draft.owner || card.owner);
      setNotes(draft.subtitle ?? "");
      setPurpose("");
      setCallStatus("Scheduled");
      setMeetingStatus("Scheduled");
      return;
    }

    setTitle("");
    setWhen("");
    setOwner(card.owner);
    setNotes("");
    setPurpose("");
    setCallStatus("Scheduled");
    setMeetingStatus("Scheduled");
  }, [open, kind, card.owner, editId, draft?.id]);

  const owners = ACTIVITY_OWNERS.includes(
    card.owner as (typeof ACTIVITY_OWNERS)[number],
  )
    ? [...ACTIVITY_OWNERS]
    : [card.owner, ...ACTIVITY_OWNERS];

  function handleSave() {
    if (!title.trim()) {
      setError("Add a subject");
      return;
    }
    if (!when.trim()) {
      setError("Add a date and time");
      return;
    }
    const at = new Date(when);
    if (Number.isNaN(at.getTime())) {
      setError("Enter a valid date and time");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (kind === "call") {
        if (editId && findCallById(editId)) {
          updateCall(editId, {
            subject: title.trim(),
            relatedTo: `Lead: ${card.name}`,
            contact: card.name,
            date: formatCallDate(at),
            assignedTo: owner,
            agenda: notes.trim() || undefined,
            purpose: purpose.trim() || undefined,
            notes: notes.trim() || undefined,
            status: callStatus,
          });
        } else {
          createCall({
            subject: title.trim(),
            relatedTo: `Lead: ${card.name}`,
            contact: card.name,
            callType: "Outbound",
            status: callStatus,
            date: formatCallDate(at),
            assignedTo: owner,
            agenda: notes.trim() || undefined,
            purpose: purpose.trim() || undefined,
            notes: notes.trim() || undefined,
          });
        }
      } else if (editId && findMeetingById(editId)) {
        const end = new Date(at.getTime() + 60 * 60 * 1000);
        updateMeeting(editId, {
          title: title.trim(),
          startDateTime: formatMeetingDateTime(at),
          endDateTime: formatMeetingDateTime(end),
          notes: notes.trim() || undefined,
          status: meetingStatus,
        });
      } else {
        const end = new Date(at.getTime() + 60 * 60 * 1000);
        createMeeting({
          title: title.trim(),
          relatedTo: `Lead: ${card.name}`,
          type: MEETING_TYPES[0],
          startDateTime: formatMeetingDateTime(at),
          endDateTime: formatMeetingDateTime(end),
          organizer: owner,
          notes: notes.trim() || undefined,
          status: meetingStatus,
        });
      }
      emitLeadActivityChange();
      onSaved?.(draft?.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setSaving(false);
    }
  }

  const heading = editing
    ? kind === "call"
      ? "Edit Call"
      : "Edit Meeting"
    : kind === "call"
      ? "Create Call"
      : "Create Meeting";

  if (kind === "meeting") {
    return (
      <LeadScheduleMeetingModal
        open={open}
        card={card}
        onClose={onClose}
        onSaved={onSaved}
        editId={editId}
        draft={draft}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] w-full overflow-hidden p-0 sm:max-w-[28rem]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <DialogTitle className="text-[16px] font-semibold text-slate-900">
            {heading}
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <DialogDescription className="sr-only">
          {heading} for {card.name} without leaving this lead.
        </DialogDescription>
        <div className="space-y-3 px-5 py-3">
          <div>
            <label className={labelClass}>
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === "call" ? "e.g. Follow up call" : "e.g. Strategy meeting"}
            />
          </div>
          <div>
            <label className={labelClass}>
              Date & time <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="datetime-local"
                className={cn(inputClass, "pl-9")}
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Owner</label>
            <SearchablePersonSelect
              value={owner}
              onChange={setOwner}
              options={owners}
              placeholder="Search owner…"
            />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            {kind === "call" ? (
              <select
                className={inputClass}
                value={callStatus}
                onChange={(e) => setCallStatus(e.target.value as CallStatus)}
              >
                {CALL_STAGES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                ))}
              </select>
            ) : (
              <select
                className={inputClass}
                value={meetingStatus}
                onChange={(e) =>
                  setMeetingStatus(e.target.value as MeetingStatus)
                }
              >
                {MEETING_STATUSES.filter((status) => status !== "Cancelled").map(
                  (status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ),
                )}
              </select>
            )}
          </div>
          {kind === "call" ? (
            <div>
              <label className={labelClass}>Call purpose</label>
              <select
                className={inputClass}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              >
                <option value="">Select purpose</option>
                {CALL_PURPOSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className={labelClass}>
              {kind === "call" ? "Call agenda" : "Notes"}
            </label>
            <textarea
              rows={4}
              className={cn(inputClass, "resize-none")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                kind === "call"
                  ? "Outline the key topics to be discussed…"
                  : "Add context…"
              }
            />
          </div>
        </div>
        {error ? (
          <p className="px-5 pb-1 text-[12px] text-rose-600">{error}</p>
        ) : null}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: PURPLE }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
