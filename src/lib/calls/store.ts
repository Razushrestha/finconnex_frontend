/** Live calls board store (session-backed). */

import {
  callColumns as SEED_COLUMNS,
  type Call,
  type CallColumn,
  type CallStatus,
  type CallType,
} from "@/lib/calls/types";
import { createBoardStore } from "@/lib/rules/module-store";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";

function cloneSeed(): CallColumn[] {
  return SEED_COLUMNS.map((col) => ({
    ...col,
    calls: col.calls.map((c) => ({ ...c })),
  }));
}

function normalize(cols: CallColumn[]): CallColumn[] {
  return cols.map((col) => ({
    ...col,
    count: col.calls.length,
    calls: col.calls.map((c) => ({ ...c, status: col.title })),
  }));
}

const board = createBoardStore({
  key: "activities:calls:board:v1",
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
  callType: CallType;
  status: CallStatus;
  date: string;
  duration?: string;
  notes?: string;
  assignedTo: string;
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
    callType: input.callType,
    status: target.title,
    date: input.date,
    duration: input.duration,
    notes: input.notes,
    assignedTo: input.assignedTo,
  };
  saveCallColumns(
    cols.map((c) =>
      c.id === target.id
        ? { ...c, calls: [call, ...c.calls], count: c.calls.length + 1 }
        : c,
    ),
  );
  emitLeadActivityChange();
  return call;
}

export function findCallById(id: string) {
  for (const col of listCallColumns()) {
    const call = col.calls.find((c) => c.id === id);
    if (call) return { call, status: col.title, columnId: col.id };
  }
  return null;
}

export function formatCallDate(d: Date): string {
  return formatRulesAt(d);
}
