import { NextResponse } from "next/server";

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
    return NextResponse.json(current);
  }
  const body = (await request.json().catch(() => ({}))) as { remarks?: string };
  const remarks = body.remarks?.trim() ?? "";
  if (!remarks) {
    return NextResponse.json({ error: "Remarks are required." }, { status: 400 });
  }
  const next = {
    ...current,
    status: "cancelled" as const,
    remarks,
    updatedAt: new Date().toISOString(),
  };
  await saveAppointmentManage(next);
  const crmUpdated = await syncAppointmentToCrm(next, "cancel").catch(() => false);
  return NextResponse.json({ ...next, crmUpdated });
}
