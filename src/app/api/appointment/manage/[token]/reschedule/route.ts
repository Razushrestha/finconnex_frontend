import { NextResponse } from "next/server";

import { normalizeTimeZone } from "@/lib/meetings/appointment-manage";
import { syncAppointmentToCrm } from "@/lib/meetings/appointment-manage-crm";
import {
  readAppointmentManage,
  saveAppointmentManage,
} from "@/lib/meetings/appointment-manage-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const current = await readAppointmentManage(token);
  if (!current) {
    return NextResponse.json({ error: "This appointment link is not valid." }, { status: 404 });
  }
  if (current.status === "cancelled") {
    return NextResponse.json({ error: "This appointment is already cancelled." }, { status: 409 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    dateIso?: string;
    startHHmm?: string;
    timeZone?: string;
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.dateIso ?? "") || !/^\d{2}:\d{2}$/.test(body.startHHmm ?? "")) {
    return NextResponse.json({ error: "Choose a date and a time slot." }, { status: 400 });
  }
  const next = {
    ...current,
    dateIso: body.dateIso ?? current.dateIso,
    startHHmm: body.startHHmm ?? current.startHHmm,
    timeZone: normalizeTimeZone(body.timeZone || current.timeZone),
    updatedAt: new Date().toISOString(),
  };
  await saveAppointmentManage(next);
  const crmUpdated = await syncAppointmentToCrm(next, "reschedule").catch(() => false);
  return NextResponse.json({ ...next, crmUpdated });
}
