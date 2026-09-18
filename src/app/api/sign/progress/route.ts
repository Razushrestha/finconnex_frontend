import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listPublicSignSessions } from "@/lib/documents/signature/public-sign-store";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ items: [] }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    requestId?: string;
    tokens?: string[];
  };
  const tokens = Array.isArray(body.tokens)
    ? body.tokens.map((token) => String(token || "").trim()).filter(Boolean)
    : [];
  const requestId =
    typeof body.requestId === "string" ? body.requestId.trim() : "";
  if (!tokens.length && !requestId) {
    return NextResponse.json({ items: [] });
  }
  const items = await listPublicSignSessions({ requestId, tokens });
  return NextResponse.json(
    {
      items: items.map((item) => ({
        token: item.token,
        status: item.status ?? "Sent",
        signedAt: item.signedAt ?? null,
        viewedAt: item.viewedAt ?? null,
        consumed: Boolean(item.consumed),
        signerId: item.signerId ?? null,
        signerEmail: item.signerEmail ?? null,
        recipientName: item.recipientName ?? null,
        documentUrl: item.documentUrl ?? null,
        fields: item.fields ?? [],
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
