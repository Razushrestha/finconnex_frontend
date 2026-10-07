import { NextResponse } from "next/server";
import { isLocalSignToken } from "@/lib/documents/signature/public-sign-proxy";
import {
  readPublicSignSession,
  writePublicSignSession,
} from "@/lib/documents/signature/public-sign-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const safeToken = token?.trim();
  if (!safeToken) {
    return NextResponse.json({ error: "Missing signing token" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    event?: string;
    termsAgreedAt?: string;
  };
  const local = await readPublicSignSession(safeToken);
  if (local?.consumed) {
    return NextResponse.json(
      { error: "This signing link has expired.", expired: true, status: "Signed" },
      { status: 410 },
    );
  }
  const current = String(local?.status ?? "").toLowerCase();
  if (local && !current.includes("sign") && !current.includes("declin")) {
    const agreeing = body.event === "terms";
    const agreedAt =
      (typeof body.termsAgreedAt === "string" && body.termsAgreedAt.trim()) ||
      new Date().toISOString();
    await writePublicSignSession(safeToken, {
      ...local,
      status: agreeing ? local.status || "Viewed" : "Viewed",
      viewedAt: local.viewedAt || new Date().toISOString(),
      ...(agreeing
        ? { termsAgreedAt: local.termsAgreedAt || agreedAt }
        : {}),
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
