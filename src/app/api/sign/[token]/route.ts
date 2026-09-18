import { NextResponse } from "next/server";
import { canPublishPublicSign } from "@/lib/documents/signature/public-sign-auth";
import {
  fetchPublicSignature,
  isLocalSignToken,
  publicDocumentUrl,
} from "@/lib/documents/signature/public-sign-proxy";
import {
  publicSignDocumentPath,
  readPublicSignDocument,
  readPublicSignSession,
  writePublicSignSession,
} from "@/lib/documents/signature/public-sign-store";

function asSessionPayload(
  token: string,
  data: Record<string, unknown>,
  hasLocalFile: boolean,
) {
  const documentUrl =
    publicDocumentUrl(data) ||
    (hasLocalFile ? publicSignDocumentPath(token) : null);
  return {
    ...data,
    documentUrl,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const safeToken = token?.trim();
  if (!safeToken) {
    return NextResponse.json({ error: "Missing signing token" }, { status: 400 });
  }

  const local = await readPublicSignSession(safeToken);
  const hasFile = Boolean(await readPublicSignDocument(safeToken));

  if (isLocalSignToken(safeToken)) {
    return NextResponse.json(
      asSessionPayload(
        safeToken,
        (local as Record<string, unknown> | null) ?? {
          documentUrl: null,
          fields: [],
        },
        hasFile,
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const result = await fetchPublicSignature(safeToken);
  if (result.ok) {
    return NextResponse.json(asSessionPayload(safeToken, result.data, hasFile));
  }

  if (local) {
    return NextResponse.json(
      asSessionPayload(safeToken, local as Record<string, unknown>, hasFile),
    );
  }

  return NextResponse.json(
    { documentUrl: null, fields: [] },
    { status: result.status === 404 ? 404 : 200 },
  );
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  if (!(await canPublishPublicSign(request))) {
    return NextResponse.json({ error: "Sign in to publish a signing link" }, { status: 401 });
  }
  const { token } = await context.params;
  const safeToken = token?.trim();
  if (!safeToken || !isLocalSignToken(safeToken)) {
    return NextResponse.json({ error: "Invalid signing token" }, { status: 400 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  await writePublicSignSession(safeToken, {
    documentName: typeof body.documentName === "string" ? body.documentName : "",
    recipientName: typeof body.recipientName === "string" ? body.recipientName : "",
    role: typeof body.role === "string" ? body.role : "Signer",
    status: typeof body.status === "string" ? body.status : "Sent",
    fields: Array.isArray(body.fields) ? body.fields : [],
    documentUrl: publicSignDocumentPath(safeToken),
  });
  return NextResponse.json({ ok: true });
}
