import { NextResponse } from "next/server";
import { canPublishPublicSign } from "@/lib/documents/signature/public-sign-auth";
import {
  fetchPublicSignature,
  isLocalSignToken,
  publicDocumentUrl,
} from "@/lib/documents/signature/public-sign-proxy";
import {
  readPublicSignDocument,
  writePublicSignDocument,
} from "@/lib/documents/signature/public-sign-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const safeToken = token?.trim();
  if (!safeToken) {
    return NextResponse.json({ documentUrl: null }, { status: 400 });
  }

  const stored = await readPublicSignDocument(safeToken);
  if (stored) {
    return new NextResponse(new Uint8Array(stored.bytes), {
      status: 200,
      headers: {
        "Content-Type": stored.contentType || "application/pdf",
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (isLocalSignToken(safeToken)) {
    return NextResponse.json({ documentUrl: null });
  }

  const result = await fetchPublicSignature(safeToken);
  const url = result.ok ? publicDocumentUrl(result.data) : "";
  if (!url) {
    return NextResponse.json({ documentUrl: null });
  }
  return NextResponse.json({ documentUrl: url });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  if (!(await canPublishPublicSign(request))) {
    return NextResponse.json({ error: "Sign in to attach a signing document" }, { status: 401 });
  }
  const { token } = await context.params;
  const safeToken = token?.trim();
  if (!safeToken || !isLocalSignToken(safeToken)) {
    return NextResponse.json({ error: "Invalid signing token" }, { status: 400 });
  }
  const form = await request.formData().catch(() => null);
  const entry = form?.get("file");
  if (!(entry instanceof File) || entry.size < 1) {
    return NextResponse.json({ error: "Choose a document to attach" }, { status: 400 });
  }
  if (entry.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Documents can be at most 10 MB" }, { status: 400 });
  }
  const bytes = Buffer.from(await entry.arrayBuffer());
  await writePublicSignDocument(
    safeToken,
    bytes,
    entry.type || "application/pdf",
  );
  return NextResponse.json({ ok: true });
}
