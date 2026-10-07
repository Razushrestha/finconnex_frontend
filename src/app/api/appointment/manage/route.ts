import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { latestGuestClocks } from "@/lib/meetings/appointment-manage";
import {
  appointmentFromInput,
  listAppointmentManage,
  newAppointmentToken,
  saveAppointmentManage,
} from "@/lib/meetings/appointment-manage-store";

function normalizeClock(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const hour = Number(match[1]);
  if (hour > 23) return "";
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to load appointments." }, { status: 401 });
  }
  const records = await listAppointmentManage();
  return NextResponse.json(latestGuestClocks(records));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to send this appointment." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    meetingId?: string;
    title?: string;
    guestName?: string;
    hostName?: string;
    dateIso?: string;
    startHHmm?: string;
    durationMinutes?: number;
    timeZoneLabel?: string;
  };
  const startHHmm = normalizeClock(body.startHHmm ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.dateIso ?? "") || !startHHmm) {
    return NextResponse.json({ error: "A date and time are required." }, { status: 400 });
  }
  const record = appointmentFromInput({
    token: newAppointmentToken(),
    meetingId: body.meetingId,
    title: body.title ?? "",
    guestName: body.guestName ?? "",
    hostName: body.hostName ?? "",
    dateIso: body.dateIso ?? "",
    startHHmm,
    durationMinutes: Number(body.durationMinutes) || 30,
    timeZoneLabel: body.timeZoneLabel,
  });
  await saveAppointmentManage(record);
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    token: record.token,
    rescheduleUrl: `${origin}/appointment/${record.token}/reschedule`,
    cancelUrl: `${origin}/appointment/${record.token}/cancel`,
  });
}
