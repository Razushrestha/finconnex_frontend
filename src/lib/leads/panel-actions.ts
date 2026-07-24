/**
 * Persist Lead Card quick actions into live activity module stores.
 */

import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { formatRulesAt } from "@/lib/rules/storage";
import { getRulesActor } from "@/lib/rules/actor";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";
import type { LeadCardQuickActionState } from "@/lib/leads/card-types";
import { createCall, formatCallDate } from "@/lib/calls/store";
import { createMeeting, formatMeetingDateTime } from "@/lib/meetings/store";
import { createMessage } from "@/lib/messages/store";
import { createEmail } from "@/lib/emails/store";
import { createNote } from "@/lib/notes/store";
import { createAttachment } from "@/lib/attachments/store";
import { getUploadAdapter } from "@/lib/attachments/upload";
import { createTask } from "@/lib/tasks/store";
import type { Priority } from "@/lib/tasks/types";
import type { AttachmentKind } from "@/lib/attachments/types";

export type QuickActionKind = LeadCardQuickActionState["kind"];

function actorName() {
  return getRulesActor().name || ACTIVITY_OWNERS[0];
}

function toDateInputValue(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toTimeInputValue(d = new Date()) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** HTML date+time → Date */
export function combineDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
}

export function defaultQuickActionDraft(kind?: QuickActionKind) {
  void kind;
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    body: "",
    date: toDateInputValue(later),
    time: toTimeInputValue(later),
    priority: "Medium" as Priority,
    assignedTo: actorName(),
  };
}

/** Full create-page URL with Lead relatedTo prefilled. */
export function leadCreateHref(
  kind: QuickActionKind,
  leadName: string,
  opts?: { email?: string; phone?: string },
): string {
  const base: Record<QuickActionKind, string> = {
    call: "/activities/calls/create",
    sms: "/activities/messages/create",
    email: "/activities/emails/create",
    meeting: "/activities/meetings/create",
    task: "/activities/tasks/create",
    note: "/activities/notes/create",
    attachment: "/activities/attachments",
  };
  const params = new URLSearchParams();
  params.set("relatedKind", "Lead");
  params.set("relatedName", leadName);
  if (kind !== "attachment") params.set("redirect", "true");
  else params.set("compose", "1");
  if (opts?.email) params.set("to", opts.email);
  if (opts?.phone) params.set("phone", opts.phone);
  return `${base[kind]}?${params.toString()}`;
}

export async function submitLeadQuickAction(
  kind: QuickActionKind,
  leadName: string,
  draft: {
    title: string;
    body: string;
    date: string;
    time: string;
    priority: Priority;
    assignedTo: string;
  },
  opts?: { leadEmail?: string },
): Promise<
  { ok: true; message: string; id?: string } | { ok: false; message: string }
> {
  const title = draft.title.trim() || draft.body.trim();
  if (!title && kind !== "attachment" && kind !== "call") {
    return { ok: false, message: "Add a title or message first." };
  }
  if (kind === "attachment" && !draft.title.trim()) {
    return { ok: false, message: "Add a file name first." };
  }

  const when = combineDateTime(draft.date, draft.time);
  const owner = draft.assignedTo.trim() || actorName();
  const relatedTo = `Lead: ${leadName}`;

  if (kind === "task") {
    const dueDate = when.toLocaleDateString("en-GB");
    const task = createTask({
      title: title || "Follow-up task",
      taskType: "Follow-up",
      priority: draft.priority,
      status: "Not Started",
      dueDate,
      assignedTo: owner,
      relatedTo: { kind: "Lead", name: leadName },
      notes: draft.body.trim() || undefined,
      createdBy: owner,
    });
    emitLeadActivityChange();
    return { ok: true, message: "Task created", id: task.taskId };
  }

  if (kind === "call") {
    const call = createCall({
      subject: title || `Call ${leadName}`,
      relatedTo,
      contact: leadName,
      callType: "Outbound",
      status: "Scheduled",
      date: formatCallDate(when),
      assignedTo: owner,
      notes: draft.body.trim() || undefined,
    });
    return { ok: true, message: "Call scheduled", id: call.id };
  }

  if (kind === "meeting") {
    const end = new Date(when.getTime() + 60 * 60 * 1000);
    const meeting = createMeeting({
      title: title || `Meeting with ${leadName}`,
      relatedTo,
      type: "Video Call",
      startDateTime: formatMeetingDateTime(when),
      endDateTime: formatMeetingDateTime(end),
      organizer: owner,
      agenda: draft.body.trim() || undefined,
    });
    return { ok: true, message: "Appointment scheduled", id: meeting.id };
  }

  if (kind === "sms") {
    const msg = createMessage({
      type: "External",
      subject: title || draft.body.slice(0, 48) || "SMS",
      body: draft.body.trim() || title,
      from: owner,
      to: leadName,
      relatedTo,
      status: "Sent",
      sentDate: formatRulesAt(new Date()),
    });
    return { ok: true, message: "SMS sent", id: msg.id };
  }

  if (kind === "email") {
    const email = createEmail({
      subject: title || "Email",
      body: draft.body.trim() || title,
      from: owner,
      to: [opts?.leadEmail || `${leadName.replace(/\s+/g, ".").toLowerCase()}@example.com`],
      relatedTo,
      status: "Sent",
      sentDate: formatRulesAt(new Date()),
    });
    return { ok: true, message: "Email sent", id: email.id };
  }

  if (kind === "note") {
    const note = createNote({
      title: title || draft.body.slice(0, 60) || "Note",
      body: draft.body.trim() || title,
      relatedTo,
      noteType: "General",
      createdBy: owner,
    });
    return { ok: true, message: "Note added", id: note.id };
  }

  const fileName = title || draft.title || "document.pdf";
  const kindGuess = guessAttachmentKind(fileName);
  const placeholder =
    draft.body.trim() || `lead-card-upload:${fileName}`;
  const uploaded = await getUploadAdapter().upload({
    fileName,
    data: placeholder,
    contentType: "application/octet-stream",
    relatedTo,
  });
  if (!uploaded.ok) {
    return { ok: false, message: uploaded.message };
  }
  const att = createAttachment({
    fileName: uploaded.fileName,
    kind: kindGuess,
    relatedTo,
    uploadedBy: owner,
    notes: draft.body.trim() || undefined,
    sizeLabel: uploaded.sizeLabel,
    storageUrl: uploaded.storageUrl,
    contentType: uploaded.contentType,
    byteSize: uploaded.byteSize,
  });
  return { ok: true, message: "Attachment uploaded", id: att.id };
}

function guessAttachmentKind(fileName: string): AttachmentKind {
  const lower = fileName.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|heic)$/.test(lower)) return "Image";
  if (/\.(xlsx?|csv)$/.test(lower)) return "Spreadsheet";
  if (/\.(pdf|docx?|txt)$/.test(lower)) return "Document";
  return "Other";
}
