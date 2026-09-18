import { NextResponse } from "next/server";
import { isLocalSignToken } from "@/lib/documents/signature/public-sign-proxy";
import { canPublishPublicSign } from "@/lib/documents/signature/public-sign-auth";
import {
  publicSignDocumentPath,
  writePublicSignDocument,
  writePublicSignSession,
} from "@/lib/documents/signature/public-sign-store";

type PublishSigner = {
  token?: string;
  name?: string;
  role?: string;
  id?: string;
  email?: string;
};

export async function POST(request: Request) {
  if (!(await canPublishPublicSign(request))) {
    return NextResponse.json(
      { error: "Sign in to publish a signing link" },
      { status: 401 },
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Missing signing payload" }, { status: 400 });
  }

  let meta: {
    documentName?: string;
    fields?: unknown[];
    signers?: PublishSigner[];
    requestId?: string;
  } = {};
  try {
    meta = JSON.parse(String(form.get("meta") || "{}")) as typeof meta;
  } catch {
    return NextResponse.json({ error: "Invalid signing payload" }, { status: 400 });
  }

  const signers = (meta.signers ?? []).filter(
    (signer) => signer.token && signer.role !== "CC",
  );
  if (!signers.length) {
    return NextResponse.json({ error: "No signers to publish" }, { status: 400 });
  }

  const file = form.get("file");
  const bytes =
    file instanceof File && file.size > 0
      ? Buffer.from(await file.arrayBuffer())
      : null;
  const contentType =
    file instanceof File ? file.type || "application/pdf" : "application/pdf";

  for (const signer of signers) {
    const token = String(signer.token).trim();
    if (!isLocalSignToken(token)) continue;
    await writePublicSignSession(token, {
      documentName: meta.documentName || "Document",
      recipientName: signer.name || "Signer",
      role: signer.role || "Signer",
      status: "Sent",
      requestId: typeof meta.requestId === "string" ? meta.requestId : "",
      signerId: signer.id || "",
      signerEmail: signer.email || "",
      fields: Array.isArray(meta.fields) ? meta.fields : [],
      documentUrl: publicSignDocumentPath(token),
    });
    if (bytes) {
      await writePublicSignDocument(token, bytes, contentType);
    }
  }

  return NextResponse.json({ ok: true, published: signers.length });
}
