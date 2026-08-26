/** Live calls board store (session-backed). */

import {
  callColumns as SEED_COLUMNS,
  type Call,
  type CallColumn,
  type CallFollowUp,
  type CallStatus,
  type CallType,
} from "@/lib/calls/types";
import type { TaskReminder } from "@/lib/tasks/types";
import { createBoardStore } from "@/lib/rules/module-store";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";

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
  key: "activities:calls:board:v2",
  seed: cloneSeed,
});

export function listCallColumns(): CallColumn[] {
  return normalize(board.list());
}

export function saveCallColumns(cols: CallColumn[]) {
  board.save(normalize(cols));
}

export function listCalls(): Call[] {
  return listCallColumns().flatMap((c) => c.calls);
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
  reminders?: TaskReminder[];
  nextSteps?: CallFollowUp[];
}): Call {
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
    reminders: input.reminders?.map((r) => ({ ...r })) ?? [],
    nextSteps: input.nextSteps?.map((s) => ({ ...s })) ?? [],
  };
  saveCallColumns(
    cols.map((c) =>
      c.id === target.id
        ? { ...c, calls: [call, ...c.calls], count: c.calls.length + 1 }
        : c,
    ),
  );
  emitLeadActivityChange();
  void import("@/lib/calls/api").then(async ({ createCrmCall, tryCrm }) => {
    const remote = await tryCrm(() => createCrmCall(input));
    if (remote?.id && remote.id !== call.id) {
      deleteCall(call.id, { skipCrm: true });
      mergeCrmCalls([remote]);
    } else if (remote) {
      mergeCrmCalls([remote]);
    }
  });
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
  const merged: Call = normalizeCall(
    { ...found.call, ...patch, id },
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

export function mergeCrmCalls(remote: Call[]) {
  if (!remote.length) return;
  const remoteIds = new Set(remote.map((c) => c.id));
  const cols = listCallColumns().map((col) => ({
    ...col,
    calls: col.calls.filter((c) => !remoteIds.has(c.id)),
  }));
  let next = cols;
  for (const call of remote) {
    const target =
      next.find((c) => c.title === call.status) ??
      next.find((c) => c.title === "Scheduled") ??
      next[0];
    if (!target) continue;
    next = next.map((col) =>
      col.id === target.id
        ? {
            ...col,
            calls: [normalizeCall(call, target.title), ...col.calls],
          }
        : col,
    );
  }
  saveCallColumns(next);
  emitLeadActivityChange();
}

export function parseCallDurationSeconds(call: Call): number {
  if (call.recording?.durationSeconds) return call.recording.durationSeconds;
  const raw = call.duration?.trim();
  if (!raw) return 0;
  const minutes = raw.match(/^(\d+)\s*min/i);
  if (minutes) return Number(minutes[1]) * 60;
  const clock = raw.match(/^(\d+):(\d{2})$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  return 0;
}

export function formatCallDate(d: Date): string {
  return formatRulesAt(d);
}
