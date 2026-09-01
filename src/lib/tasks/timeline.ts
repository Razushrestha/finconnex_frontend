/** Task-only activity timeline: audit, notes, mentions, reminders, emails. */

import { listEmails } from "@/lib/emails/store";
import { parseFlexibleDate } from "@/lib/leads/activity-dates";
import { parseMentionNames } from "@/lib/mentions/people";
import { listAuditEvents, type AuditEvent } from "@/lib/rules/audit";
import {
  formatTaskReminderWhen,
  reminderFrequencyLabel,
  type Task,
} from "@/lib/tasks/types";

export type TaskTimelineKind =
  | "created"
  | "modified"
  | "status"
  | "note"
  | "mention"
  | "reminder"
  | "action"
  | "email"
  | "completed";

export interface TaskTimelineChange {
  field: string;
  from: string;
  to: string;
}

export interface TaskTimelineEvent {
  id: string;
  kind: TaskTimelineKind;
  at: Date;
  atLabel: string;
  actor: string;
  headline: string;
  detail?: string;
  changes?: TaskTimelineChange[];
  mentions?: string[];
}

const TASK_MODULE = "activities.tasks";

function parseTimelineAt(raw?: string | null): Date | null {
  if (!raw?.trim()) return null;
  const cleaned = raw.replace(/,/g, "");
  return parseFlexibleDate(cleaned);
}

function displayAt(date: Date, fallback?: string) {
  if (fallback?.trim()) return fallback.trim();
  return date.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function stringifyValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (value.every((item) => typeof item === "string")) return value.join(", ");
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.name === "string") {
      return record.kind ? `${record.kind}: ${record.name}` : record.name;
    }
    if (typeof record.text === "string") return record.text;
    if (typeof record.title === "string") return record.title;
    try {
      return JSON.stringify(value);
    } catch {
      return "Updated";
    }
  }
  return String(value);
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    title: "Title",
    status: "Status",
    priority: "Priority",
    dueDate: "Due date",
    assignedTo: "Owner",
    description: "Description",
    notes: "Internal notes",
    collaborators: "Collaborators",
    actionItems: "Action items",
    reminderDate: "Reminder date",
    reminders: "Reminders",
    taskType: "Task type",
    relatedTo: "Related to",
    notifyBy: "Notify via",
    note: "Note",
  };
  return labels[field] ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function taskAuditEvents(task: Task): AuditEvent[] {
  return listAuditEvents().filter((event) => {
    if (event.module !== TASK_MODULE) return false;
    if (event.recordId && event.recordId === task.taskId) return true;
    if (event.recordLabel && event.recordLabel === task.title) return true;
    return false;
  });
}

function relatedEmails(task: Task) {
  const title = task.title.trim().toLowerCase();
  const id = task.taskId.toLowerCase();
  return listEmails().filter((email) => {
    const related = (email.relatedTo ?? "").toLowerCase();
    const subject = email.subject.toLowerCase();
    if (id && related.includes(id)) return true;
    if (title && related.includes(`task: ${title}`)) return true;
    if (title && related === title) return true;
    if (title && subject.includes(title)) return true;
    return false;
  });
}

function eventFromAudit(event: AuditEvent): TaskTimelineEvent | null {
  const at = parseTimelineAt(event.at) ?? new Date();
  const changes = (event.changes ?? []).map((change) => ({
    field: fieldLabel(change.field),
    from: stringifyValue(change.from),
    to: stringifyValue(change.to),
  }));
  const noteChange = event.changes?.find((change) => change.field === "note");
  if (noteChange || event.meta?.kind === "note") {
    const body = stringifyValue(noteChange?.to ?? event.summary);
    return {
      id: event.id,
      kind: "note",
      at,
      atLabel: displayAt(at, event.at),
      actor: event.actor,
      headline: "Note added",
      detail: body === "—" ? event.summary : body,
      mentions: parseMentionNames(typeof noteChange?.to === "string" ? noteChange.to : ""),
    };
  }
  if (event.action === "create") {
    return {
      id: event.id,
      kind: "created",
      at,
      atLabel: displayAt(at, event.at),
      actor: event.actor,
      headline: "Task created",
      detail: event.recordLabel ? `“${event.recordLabel}” was created.` : event.summary,
    };
  }
  if (event.action === "status_change" || changes.some((change) => change.field === "Status")) {
    const status = changes.find((change) => change.field === "Status");
    return {
      id: event.id,
      kind: event.summary.toLowerCase().includes("completed") ? "completed" : "status",
      at,
      atLabel: displayAt(at, event.at),
      actor: event.actor,
      headline: status ? `Status changed to ${status.to}` : event.summary,
      detail: status ? `${status.from} → ${status.to}` : event.summary,
      changes,
    };
  }
  return {
    id: event.id,
    kind: "modified",
    at,
    atLabel: displayAt(at, event.at),
    actor: event.actor,
    headline: event.summary || "Task updated",
    detail:
      changes.length > 0
        ? changes.map((change) => `${change.field}: ${change.from} → ${change.to}`).join(" · ")
        : event.summary,
    changes,
  };
}

export function listTaskTimeline(task: Task): TaskTimelineEvent[] {
  const events: TaskTimelineEvent[] = [];
  const seen = new Set<string>();

  function push(event: TaskTimelineEvent) {
    const key = `${event.kind}|${event.headline}|${event.detail ?? ""}|${event.at.toISOString().slice(0, 16)}`;
    if (seen.has(key) || seen.has(event.id)) return;
    seen.add(key);
    seen.add(event.id);
    events.push(event);
  }

  for (const audit of taskAuditEvents(task)) {
    const next = eventFromAudit(audit);
    if (next) push(next);
  }

  const createdAt = parseTimelineAt(task.createdOn);
  if (createdAt) {
    push({
      id: `${task.taskId}-created`,
      kind: "created",
      at: createdAt,
      atLabel: displayAt(createdAt, task.createdOn),
      actor: task.createdBy || task.assignedTo,
      headline: "Task created",
      detail: `“${task.title}” was created${task.taskType ? ` as ${task.taskType}` : ""}.`,
    });
  }

  if (task.description?.trim()) {
    const mentions = parseMentionNames(task.description);
    const at = parseTimelineAt(task.modifiedOn) ?? createdAt ?? new Date();
    push({
      id: `${task.taskId}-description`,
      kind: "modified",
      at,
      atLabel: displayAt(at, task.modifiedOn),
      actor: task.modifiedBy || task.createdBy || task.assignedTo,
      headline: "Description set",
      detail: task.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 240),
      mentions,
    });
  }

  if (task.notes?.trim()) {
    const mentions = parseMentionNames(task.notes);
    const at = parseTimelineAt(task.modifiedOn) ?? createdAt ?? new Date();
    push({
      id: `${task.taskId}-internal-notes`,
      kind: "note",
      at,
      atLabel: displayAt(at, task.modifiedOn),
      actor: task.modifiedBy || task.createdBy || task.assignedTo,
      headline: "Internal notes",
      detail: task.notes.trim(),
      mentions,
    });
  }

  for (const note of task.activityNotes ?? []) {
    const at = parseTimelineAt(note.createdAt) ?? createdAt ?? new Date();
    const mentions = parseMentionNames(note.body);
    push({
      id: note.id,
      kind: "note",
      at,
      atLabel: displayAt(at, note.createdAt),
      actor: note.author,
      headline: "Note added",
      detail: note.body,
      mentions,
    });
    mentions.forEach((name, index) => {
      push({
        id: `${note.id}-mention-${index}`,
        kind: "mention",
        at,
        atLabel: displayAt(at, note.createdAt),
        actor: note.author,
        headline: `Mentioned ${name}`,
        detail: note.body,
        mentions: [name],
      });
    });
  }

  (task.reminders ?? []).forEach((reminder, index) => {
    const stamp = `${reminder.date ?? ""} ${reminder.time ?? ""}`.trim();
    const at =
      parseTimelineAt(stamp) ??
      parseTimelineAt(reminder.date) ??
      createdAt ??
      new Date();
    push({
      id: reminder.id || `${task.taskId}-reminder-${index}`,
      kind: "reminder",
      at,
      atLabel: formatTaskReminderWhen(reminder),
      actor: task.createdBy || task.assignedTo,
      headline:
        reminder.status === "Completed"
          ? "Reminder completed"
          : "Reminder scheduled",
      detail: [
        formatTaskReminderWhen(reminder),
        reminder.notify ? `Notify: ${reminder.notify}` : null,
        reminder.repeatType && reminder.repeatType !== "None"
          ? reminderFrequencyLabel(reminder.repeatType)
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  });

  (task.actionItems ?? []).forEach((item, index) => {
    const at = parseTimelineAt(task.modifiedOn) ?? createdAt ?? new Date();
    push({
      id: item.id || `${task.taskId}-action-${index}`,
      kind: "action",
      at,
      atLabel: displayAt(at, task.modifiedOn),
      actor: task.modifiedBy || task.createdBy || task.assignedTo,
      headline: item.done ? "Action item completed" : "Action item added",
      detail: item.text,
    });
  });

  if (task.status === "Completed") {
    const at =
      parseTimelineAt(task.completedDate) ??
      parseTimelineAt(task.modifiedOn) ??
      createdAt ??
      new Date();
    push({
      id: `${task.taskId}-completed`,
      kind: "completed",
      at,
      atLabel: displayAt(at, task.completedDate || task.modifiedOn),
      actor: task.completedBy || task.modifiedBy || task.assignedTo,
      headline: "Task completed",
      detail: `Closed${task.completedDate ? ` on ${task.completedDate}` : ""}.`,
    });
  }

  for (const email of relatedEmails(task)) {
    const at =
      parseTimelineAt(email.sentDate) ??
      parseTimelineAt(email.openedDate) ??
      createdAt ??
      new Date();
    push({
      id: `email-${email.id}`,
      kind: "email",
      at,
      atLabel: displayAt(at, email.sentDate || email.openedDate),
      actor: email.from,
      headline: email.subject || "Email",
      detail: [
        email.status,
        email.to.length ? `To ${email.to.join(", ")}` : null,
        email.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220),
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}
