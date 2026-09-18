import { NextResponse } from "next/server";
import { isLocalSignToken } from "@/lib/documents/signature/public-sign-proxy";
import {
  readPublicSignSession,
  writePublicSignSession,
} from "@/lib/documents/signature/public-sign-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const safeToken = token?.trim();
  if (!safeToken) {
    return NextResponse.json({ error: "Missing signing token" }, { status: 400 });
  }

  const local = await readPublicSignSession(safeToken);
  if (local?.consumed) {
    return NextResponse.json(
      { error: "This signing link has expired.", expired: true, status: "Signed" },
      { status: 410 },
    );
  }
  const current = String(local?.status ?? "").toLowerCase();
  if (local && !current.includes("sign") && !current.includes("declin")) {
    await writePublicSignSession(safeToken, {
      ...local,
      status: "Viewed",
      viewedAt: new Date().toISOString(),
    });
  }

  if (isLocalSignToken(safeToken) || local) {
    const next = await readPublicSignSession(safeToken);
    return NextResponse.json({
      ok: true,
      status: next?.status ?? "Viewed",
      viewedAt: next?.viewedAt,
    });
  }

  return NextResponse.json({ ok: true, status: "Viewed" });
}
