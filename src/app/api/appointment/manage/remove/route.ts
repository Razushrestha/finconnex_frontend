import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { appointmentDeleteMatch } from "@/lib/meetings/appointment-manage";
import {
  appointmentFromInput,
  listAppointmentManage,
  newAppointmentToken,
  saveAppointmentManage,
} from "@/lib/meetings/appointment-manage-store";

/** Removes the guest's reschedule and cancel pages for this appointment. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to delete this appointment." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    meetingId?: string;
    bookingId?: string;
    title?: string;
    guestName?: string;
    hostName?: string;
    start?: string;
  };
  const meetingId = body.meetingId?.trim() ?? "";
  const bookingId = body.bookingId?.trim() ?? "";
  const title = body.title?.trim() ?? "";
  const target = {
    ids: [meetingId, bookingId],
    title,
    guestName: body.guestName?.trim() ?? "",
    hostName: body.hostName?.trim() ?? "",
    start: body.start?.trim() ?? "",
  };
  const now = new Date().toISOString();
  const records = await listAppointmentManage();
  let removed = 0;
  for (const record of records) {
    if (!appointmentDeleteMatch(record, target)) continue;
    if (record.status !== "deleted") {
      await saveAppointmentManage({
        ...record,
        status: "deleted",
        meetingId: record.meetingId || meetingId || undefined,
        updatedAt: now,
      });
    }
    removed += 1;
  }
  const tombstoneId = meetingId || bookingId;
  if (!removed && (tombstoneId || title)) {
    const dateIso = /^\d{4}-\d{2}-\d{2}/.test(target.start)
      ? target.start.slice(0, 10)
      : now.slice(0, 10);
    const clock = target.start.match(/T(\d{2}:\d{2})/);
    await saveAppointmentManage({
      ...appointmentFromInput({
        token: newAppointmentToken(),
        meetingId: tombstoneId,
        title: title || "Appointment",
        guestName: target.guestName,
        hostName: target.hostName,
        dateIso,
        startHHmm: clock?.[1] || "00:00",
        durationMinutes: 30,
      }),
      status: "deleted",
      updatedAt: now,
    });
    removed = 1;
  }
  return NextResponse.json({ removed });
}
