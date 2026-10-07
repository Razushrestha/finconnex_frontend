import { NextResponse } from "next/server";

import { readAppointmentManage } from "@/lib/meetings/appointment-manage-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const record = await readAppointmentManage(token);
  if (!record) {
    return NextResponse.json({ error: "This appointment link is not valid." }, { status: 404 });
  }
  return NextResponse.json(record);
}
