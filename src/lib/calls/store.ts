/** Live calls board store (session-backed). */
/** @deprecated Phase 9 hydrate alias — live key is activities:calls:board:v2 */
export const CALLS_HYDRATE_KEY_V1 = "activities:calls:board:v1";

import {
  callColumns as SEED_COLUMNS,
  type Call,
  type CallAttachment,
  type CallColumn,
  type CallFollowUp,
  type CallStatus,
  type CallType,
} from "@/lib/calls/types";
import type { TaskActionItem, TaskReminder } from "@/lib/tasks/types";
import type { ReminderRepeatRule } from "@/lib/tasks/repeat-reminder";
import { isUuid } from "@/lib/activity-timeline/auth";
import { createBoardStore } from "@/lib/rules/module-store";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";
import { parseTaskDueDate } from "@/lib/dashboard/layout";
import { stopPendingReminders } from "@/lib/tasks/reminder-series";
import { isAssignedToCurrentUser } from "@/lib/activities/assigned-to-me";
import { getRulesActor } from "@/lib/rules/actor";

function cloneSeed(): CallColumn[] {
  return SEED_COLUMNS.map((col) => ({
    ...col,
    calls: col.calls.map((c) => ({
      ...c,
      reminders: c.reminders?.map((r) => ({ ...r })),
      nextSteps: c.nextSteps?.map((s) => ({ ...s })),
      recording: c.recording ? { ...c.recording } : undefined,
    })),
  }));
}

function normalizeCall(call: Call, status: CallStatus): Call {
  return {
    ...call,
    status,
    reminders: Array.isArray(call.reminders)
      ? call.reminders.map((r) => ({ ...r }))
      : [],
    nextSteps: Array.isArray(call.nextSteps)
      ? call.nextSteps.map((s) => ({ ...s }))
      : [],
    actionItems: Array.isArray(call.actionItems)
      ? call.actionItems.map((item) => ({ ...item }))
      : [],
    attachments: Array.isArray(call.attachments)
      ? call.attachments.map((file) => ({ ...file }))
      : [],
    attachmentsCount: Array.isArray(call.attachments)
      ? call.attachments.length
      : (call.attachmentsCount ?? 0),
  };
}

function normalize(cols: CallColumn[]): CallColumn[] {
  return cols.map((col) => ({
    ...col,
    count: col.calls.length,
    calls: col.calls.map((c) => normalizeCall(c, col.title)),
  }));
}

const board = createBoardStore({
  key: "activities:calls:board:v3",
  seed: cloneSeed,
});

const CALLS_BOARD_BACKUP = "finconnex.calls.board.backup.v1";

export function isDemoSeedCallId(id: string) {
  return /^c\d+$/i.test(id.trim());
}

function hasUserCalls(cols: CallColumn[]) {
  return cols.some((col) =>
    col.calls.some((call) => !isDemoSeedCallId(call.id)),
  );
}

function readCallsBackup(): CallColumn[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CALLS_BOARD_BACKUP);
    if (!raw) return null;
    const backup = normalize(JSON.parse(raw) as CallColumn[]);
    return hasUserCalls(backup) ? backup : null;
  } catch {
    return null;
  }
}

function writeCallsBackup(cols: CallColumn[]) {
  if (typeof localStorage === "undefined") return;
  try {
    if (hasUserCalls(cols)) {
      localStorage.setItem(CALLS_BOARD_BACKUP, JSON.stringify(cols));
    }
  } catch {
    /* ignore */
  }
}

export function listCallColumns(): CallColumn[] {
  const stored = normalize(board.list());
  if (hasUserCalls(stored)) return stored;
  return readCallsBackup() ?? stored;
}

export function saveCallColumns(cols: CallColumn[]) {
  const next = normalize(cols);
  board.save(next);
  writeCallsBackup(next);
}

export function listCalls(): Call[] {
  return listCallColumns().flatMap((c) => c.calls);
}

export function parseCallWhen(date: string): Date | null {
  return parseTaskDueDate(date);
}

export function isCallOverdue(
  call: Pick<Call, "status" | "date">,
  now = new Date(),
): boolean {
  if (call.status !== "Scheduled") return false;
  const at = parseCallWhen(call.date);
  if (!at) return false;
  return at.getTime() < now.getTime();
}

export type CallScope = "all" | "mine" | "my-overdue";

export function callMatchesScope(
  call: Pick<Call, "assignedTo" | "status" | "date">,
  scope: CallScope = "all",
) {
  if (scope === "all") return true;
  if (!isAssignedToCurrentUser(call.assignedTo)) return false;
  if (scope === "my-overdue") return isCallOverdue(call);
  return true;
}

export function createCall(input: {
  subject: string;
  relatedTo?: string;
  contact?: string;
  callFor?: string;
  fromNumber?: string;
  callType: CallType;
  status: CallStatus;
  date: string;
  duration?: string;
  notes?: string;
  agenda?: string;
  purpose?: string;
  assignedTo: string;
  calledBy?: string;
  reminders?: TaskReminder[];
  reminderDate?: string;
  reminderRepeat?: ReminderRepeatRule;
  repeatRule?: ReminderRepeatRule;
  nextSteps?: CallFollowUp[];
  actionItems?: TaskActionItem[];
  createdBy?: string;
  createdOn?: string;
  attachments?: CallAttachment[];
  relatedType?: string;
  relatedId?: string;
  contactId?: string;
}, opts?: { skipCrm?: boolean }): Call {
  const cols = listCallColumns();
  const target =
    cols.find((c) => c.title === input.status) ??
    cols.find((c) => c.title === "Scheduled") ??
    cols[0];
  const call: Call = {
    id: newRulesId("call"),
    subject: input.subject.trim(),
    relatedTo: input.relatedTo,
    contact: input.contact,
    callFor: input.callFor,
    fromNumber: input.fromNumber,
    callType: input.callType,
    status: target.title,
    date: input.date,
    duration: input.duration,
    notes: input.notes,
    agenda: input.agenda,
    purpose: input.purpose,
    assignedTo: input.assignedTo,
    calledBy: input.calledBy,
    reminders: input.reminders?.map((r) => ({ ...r })) ?? [],
    reminderDate: input.reminderDate,
    reminderRepeat: input.reminderRepeat,
    repeatRule: input.repeatRule,
    nextSteps: input.nextSteps?.map((s) => ({ ...s })) ?? [],
    actionItems: input.actionItems?.map((item) => ({ ...item })) ?? [],
    createdBy: input.createdBy,
    createdOn: input.createdOn,
    modifiedBy: input.createdBy,
    modifiedOn: input.createdOn,
    attachments: input.attachments?.map((file) => ({ ...file })) ?? [],
    attachmentsCount: input.attachments?.length ?? 0,
  };
  saveCallColumns(
    cols.map((c) =>
      c.id === target.id
        ? { ...c, calls: [call, ...c.calls], count: c.calls.length + 1 }
        : c,
    ),
  );
  emitLeadActivityChange();
  if (!opts?.skipCrm) {
    void import("@/lib/calls/api").then(async ({ createCrmCall, tryCrm }) => {
      const remote = await tryCrm(() => createCrmCall(input));
      if (
        remote?.id &&
        isUuid(remote.id) &&
        remote.id !== call.id &&
        remote.subject.trim().toLowerCase() === call.subject.trim().toLowerCase()
      ) {
        deleteCall(call.id, { skipCrm: true });
        mergeCrmCalls([remote]);
      }
    });
  }
  return call;
}

export function findCallById(id: string) {
  for (const col of listCallColumns()) {
    const call = col.calls.find((c) => c.id === id);
    if (call) return { call, status: col.title, columnId: col.id };
  }
  return null;
}

export function deleteCall(id: string, opts?: { skipCrm?: boolean }): Call | null {
  const cols = listCallColumns();
  let found: Call | null = null;
  const next = cols.map((col) => {
    const hit = col.calls.find((c) => c.id === id);
    if (hit) found = hit;
    const calls = col.calls.filter((c) => c.id !== id);
    return { ...col, calls, count: calls.length };
  });
  if (found) {
    saveCallColumns(next);
    emitLeadActivityChange();
    if (!opts?.skipCrm) {
      void import("@/lib/calls/api").then(({ deleteCrmCall, tryCrm }) => {
        void tryCrm(() => deleteCrmCall(id));
      });
    }
  }
  return found;
}

export function updateCall(id: string, patch: Partial<Call>): Call | null {
  const found = findCallById(id);
  if (!found) return null;
  const nextStatus = (patch.status ?? found.call.status) as CallStatus;
  const stopReminders =
    (nextStatus === "Completed" || nextStatus === "Cancelled") &&
    nextStatus !== found.call.status;
  const becamePlaced =
    PLACED_STATUSES.has(nextStatus) &&
    !PLACED_STATUSES.has(found.call.status);
  const recordingAdded = Boolean(patch.recording) && !found.call.recording;
  const merged: Call = normalizeCall(
    {
      ...found.call,
      ...patch,
      id,
      calledBy:
        patch.calledBy ||
        found.call.calledBy ||
        (becamePlaced || recordingAdded
          ? getRulesActor().name || found.call.assignedTo
          : found.call.calledBy),
      reminders: stopReminders
        ? stopPendingReminders(patch.reminders ?? found.call.reminders)
        : (patch.reminders ?? found.call.reminders),
    },
    nextStatus,
  );
  const cols = listCallColumns();

  if (nextStatus === found.call.status) {
    saveCallColumns(
      cols.map((col) => ({
        ...col,
        calls: col.calls.map((c) => (c.id === id ? merged : c)),
      })),
    );
  } else {
    const stripped = cols.map((col) => ({
      ...col,
      calls: col.calls.filter((c) => c.id !== id),
    }));
    const target =
      stripped.find((c) => c.title === merged.status) ??
      stripped.find((c) => c.id === found.columnId) ??
      stripped[0];
    if (!target) return null;
    saveCallColumns(
      stripped.map((col) =>
        col.id === target.id
          ? { ...col, calls: [merged, ...col.calls] }
          : col,
      ),
    );
  }

  emitLeadActivityChange();
  void import("@/lib/calls/api").then(
    async ({ syncCallStatus, updateCrmCall, rescheduleCrmCall, tryCrm }) => {
      if (nextStatus !== found.call.status) {
        await tryCrm(() =>
          syncCallStatus(id, nextStatus, {
            date: patch.date,
            notes: patch.notes,
            outcome: patch.outcome,
          }),
        );
      } else if (patch.date && patch.date !== found.call.date) {
        await tryCrm(() => rescheduleCrmCall(id, patch.date!));
      } else if (Object.keys(patch).length) {
        await tryCrm(() => updateCrmCall(id, patch));
      }
    },
  );
  return merged;
}

const PLACED_STATUSES = new Set<CallStatus>([
  "Completed",
  "Voicemail Left",
  "Left Voicemail",
]);

export function callWasPlaced(call: Call) {
  return PLACED_STATUSES.has(call.status);
}

/** Who placed or answered the call — not the same as the assigned owner. */
export function callPlacedBy(
  call: Pick<Call, "calledBy" | "createdBy" | "assignedTo">,
): string {
  return (call.calledBy || call.createdBy || call.assignedTo).trim();
}

export function callPlacedByCaption(
  call: Pick<Call, "callType" | "calledBy" | "createdBy" | "assignedTo">,
): string {
  const name = callPlacedBy(call);
  if (!name) return "";
  if (call.callType === "Inbound" || call.callType === "Missed") {
    return `Answered by ${name}`;
  }
  return `Called by ${name}`;
}

export function callHasPlayableRecording(call: Call) {
  return callWasPlaced(call) && (call.recording?.durationSeconds ?? 0) > 0;
}

function sameCallPerson(left: Call, right: Call) {
  const leftName = (left.contact || left.callFor || "").trim().toLowerCase();
  const rightName = (right.contact || right.callFor || "").trim().toLowerCase();
  if (leftName && rightName && leftName === rightName) return true;
  const leftPhone = (left.fromNumber ?? "").replace(/\D/g, "");
  const rightPhone = (right.fromNumber ?? "").replace(/\D/g, "");
  if (leftPhone.length >= 8 && leftPhone === rightPhone) return true;
  const leftRelated = (left.relatedTo ?? "").trim().toLowerCase();
  const rightRelated = (right.relatedTo ?? "").trim().toLowerCase();
  return Boolean(leftRelated && rightRelated && leftRelated === rightRelated);
}

/** Other calls for the same contact / number / related record that have a recording. */
export function listRelatedCallRecordings(call: Call): Call[] {
  return listCalls()
    .filter((other) => other.id !== call.id && callHasPlayableRecording(other))
    .filter((other) => sameCallPerson(call, other))
    .sort((a, b) => {
      const ta = parseCallWhen(a.date)?.getTime() ?? 0;
      const tb = parseCallWhen(b.date)?.getTime() ?? 0;
      return tb - ta;
    });
}

export function mergeCrmCalls(remote: Call[]) {
  if (!remote.length) return;
  const remoteIds = new Set(remote.map((c) => c.id));
  const cols = listCallColumns().map((col) => ({
    ...col,
    calls: col.calls.filter((c) => !remoteIds.has(c.id)),
  }));
  let next = cols;
  for (const call of remote) {
    const status = next.some((c) => c.title === call.status)
      ? call.status
      : "Scheduled";
    const target =
      next.find((c) => c.title === status) ??
      next.find((c) => c.title === "Scheduled") ??
      next[0];
    if (!target) continue;
    next = next.map((col) =>
      col.id === target.id
        ? {
            ...col,
            calls: [normalizeCall({ ...call, status }, target.title), ...col.calls],
          }
        : col,
    );
  }
  saveCallColumns(next);
  emitLeadActivityChange();
}

/** Replace the board from a full CRM list; keep cards the list omitted. */
export function replaceCrmCalls(remote: Call[]) {
  const cols = listCallColumns();
  const titles = new Set(cols.map((col) => col.title));
  const remoteIds = new Set(remote.map((row) => row.id));
  const extras = listCalls().filter((call) => {
    if (remoteIds.has(call.id)) return false;
    if (isDemoSeedCallId(call.id)) return false;
    const duplicate = remote.some(
      (row) =>
        row.subject.trim().toLowerCase() === call.subject.trim().toLowerCase(),
    );
    if (duplicate) return false;
    return true;
  });
  const cloned = [...remote, ...extras].map((call) =>
    titles.has(call.status) ? call : { ...call, status: "Scheduled" as CallStatus },
  );
  saveCallColumns(
    cols.map((col) => {
      const calls = cloned.filter((c) => c.status === col.title);
      return { ...col, calls, count: calls.length };
    }),
  );
  emitLeadActivityChange();
}

export function parseCallDurationSeconds(call: Call): number {
  if (call.recording?.durationSeconds) return call.recording.durationSeconds;
  const raw = call.duration?.trim();
  if (!raw) return 0;
  const minSec = raw.match(/^(\d+)\s*Min\s+(\d+)\s*Sec$/i);
  if (minSec) return Number(minSec[1]) * 60 + Number(minSec[2]);
  const minutes = raw.match(/^(\d+)\s*min/i);
  if (minutes) return Number(minutes[1]) * 60;
  const clock = raw.match(/^(\d+):(\d{2})$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  return 0;
}

export function formatCallDate(d: Date): string {
  return formatRulesAt(d);
}
