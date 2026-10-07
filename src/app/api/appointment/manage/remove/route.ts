import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import {
  listAppointmentManage,
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
    title?: string;
  };
  const meetingId = body.meetingId?.trim() ?? "";
  const title = body.title?.trim().toLowerCase() ?? "";
  const records = await listAppointmentManage();
  let removed = 0;
  for (const record of records) {
    const sameMeeting = meetingId && record.meetingId === meetingId;
    const sameTitle = title && record.title.trim().toLowerCase() === title;
    if (!sameMeeting && !sameTitle) continue;
    await saveAppointmentManage({
      ...record,
      status: "deleted",
      updatedAt: new Date().toISOString(),
    });
    removed += 1;
  }
  return NextResponse.json({ removed });
}
