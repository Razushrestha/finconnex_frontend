import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { latestGuestClocks } from "@/lib/meetings/appointment-manage";
import { syncAppointmentToCrm } from "@/lib/meetings/appointment-manage-crm";
import {
  listAppointmentManage,
  saveAppointmentManage,
} from "@/lib/meetings/appointment-manage-store";

/** Pushes guest reschedules and cancellations onto the CRM meetings the summary shows. */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to update appointments." }, { status: 401 });
  }
  const records = latestGuestClocks(await listAppointmentManage());
  let updated = 0;
  for (const record of records) {
    if (record.status === "deleted") continue;
    if (record.crmSyncedAt && record.crmSyncedAt >= record.updatedAt) continue;
    const ok = await syncAppointmentToCrm(
      record,
      record.status === "cancelled" ? "cancel" : "reschedule",
    ).catch(() => false);
    if (!ok) continue;
    await saveAppointmentManage({
      ...record,
      crmSyncedAt: new Date().toISOString(),
    });
    updated += 1;
  }
  return NextResponse.json({ updated });
}
