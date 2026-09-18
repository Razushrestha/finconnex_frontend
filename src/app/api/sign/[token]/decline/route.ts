import { NextResponse } from "next/server";
import { fetchPublicSignature, isLocalSignToken } from "@/lib/documents/signature/public-sign-proxy";
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
  const body = await request.json().catch(() => ({}));
  const result = isLocalSignToken(safeToken)
    ? { ok: false, status: 404, data: {} as Record<string, unknown> }
    : await fetchPublicSignature(safeToken, {
        method: "POST",
        body: JSON.stringify(body),
      }, "/decline");
  if (result.ok) {
    return NextResponse.json(result.data);
  }

  const local = await readPublicSignSession(safeToken);
  if (local) {
    await writePublicSignSession(safeToken, { ...local, status: "Declined" });
  }
  if (isLocalSignToken(safeToken) || local) {
    return NextResponse.json({ ok: true, status: "Declined" });
  }
  return NextResponse.json(result.data, { status: result.status });
}
