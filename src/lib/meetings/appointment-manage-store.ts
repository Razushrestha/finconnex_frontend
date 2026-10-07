import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  appointmentReference,
  normalizeTimeZone,
  type AppointmentManageRecord,
} from "@/lib/meetings/appointment-manage";

const memory = new Map<string, AppointmentManageRecord>();

function storeDir() {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "appointment-manage",
  );
}

function safeToken(token: string) {
  return token.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function fileFor(token: string) {
  return path.join(/* turbopackIgnore: true */ storeDir(), `${safeToken(token)}.json`);
}

export function newAppointmentToken() {
  return randomBytes(18).toString("base64url");
}

export async function saveAppointmentManage(record: AppointmentManageRecord) {
  memory.set(record.token, record);
  const dir = storeDir();
  await mkdir(dir, { recursive: true });
  await writeFile(fileFor(record.token), JSON.stringify(record));
  return record;
}

export async function listAppointmentManage() {
  const dir = storeDir();
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    return [...memory.values()];
  }
  const records: AppointmentManageRecord[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const record = await readAppointmentManage(name.slice(0, -".json".length));
    if (record) records.push(record);
  }
  return records;
}

export async function readAppointmentManage(token: string) {
  const key = safeToken(token);
  if (!key) return null;
  const cached = memory.get(key);
  if (cached) return cached;
  try {
    const raw = await readFile(fileFor(key), "utf8");
    const parsed = JSON.parse(raw) as AppointmentManageRecord;
    if (!parsed?.token) return null;
    memory.set(parsed.token, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function appointmentFromInput(input: {
  token: string;
  meetingId?: string;
  title: string;
  guestName: string;
  hostName: string;
  dateIso: string;
  startHHmm: string;
  durationMinutes: number;
  timeZoneLabel?: string;
}) {
  const token = safeToken(input.token);
  const record: AppointmentManageRecord = {
    token,
    meetingId: input.meetingId?.trim() || undefined,
    title: input.title.trim() || "Appointment",
    guestName: input.guestName.trim() || "Guest",
    hostName: input.hostName.trim() || "Host",
    dateIso: input.dateIso,
    startHHmm: input.startHHmm.slice(0, 5),
    durationMinutes: Math.max(15, input.durationMinutes || 30),
    timeZone: normalizeTimeZone(input.timeZoneLabel),
    reference: appointmentReference(input.meetingId?.trim() || token),
    status: "scheduled",
    updatedAt: new Date().toISOString(),
  };
  return record;
}
