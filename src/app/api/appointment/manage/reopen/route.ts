import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { reopenGuestRecord } from "@/lib/meetings/appointment-manage";
import {
  listAppointmentManage,
  saveAppointmentManage,
} from "@/lib/meetings/appointment-manage-store";

function normalizeClock(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const hour = Number(match[1]);
  if (hour > 23) return "";
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

/** Staff reschedule: the latest saved cancellation becomes a booked time again. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to reschedule this appointment." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    meetingId?: string;
    guestName?: string;
    title?: string;
    dateIso?: string;
    startHHmm?: string;
    durationMinutes?: number;
  };
  const startHHmm = normalizeClock(body.startHHmm ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.dateIso ?? "") || !startHHmm) {
    return NextResponse.json({ error: "A date and time are required." }, { status: 400 });
  }
  const meetingId = body.meetingId?.trim();
  const guest = body.guestName?.trim().toLowerCase();
  const title = body.title?.trim().toLowerCase();
  const records = await listAppointmentManage();
  const matches = records.filter((record) => {
    if (meetingId && record.meetingId === meetingId) return true;
    if (!meetingId && guest && title) {
      return (
        record.guestName.trim().toLowerCase() === guest &&
        record.title.trim().toLowerCase() === title
      );
    }
    return false;
  });
  const latest = matches.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
  if (!latest) return NextResponse.json({ updated: false });
  const saved = await saveAppointmentManage(
    reopenGuestRecord(latest, {
      dateIso: body.dateIso ?? latest.dateIso,
      startHHmm,
      durationMinutes: Number(body.durationMinutes) || latest.durationMinutes,
    }),
  );
  return NextResponse.json({ updated: true, token: saved.token, status: saved.status });
}
