import { NextResponse } from "next/server";
import { fetchPublicSignature, isLocalSignToken } from "@/lib/documents/signature/public-sign-proxy";
import {
  publicSignDocumentPath,
  readPublicSignDocument,
  readPublicSignSession,
  writePublicSignDocument,
  writePublicSignSession,
} from "@/lib/documents/signature/public-sign-store";
import { normalizeFieldKind } from "@/lib/documents/signature/field-kinds";
import {
  isPdfBytes,
  stampSignedPdfBytes,
} from "@/lib/documents/signature/stamp-signed-pdf";
import type { SignatureField, SignatureSigner } from "@/lib/documents/signature/types";

function asFields(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (row): row is Record<string, unknown> =>
      Boolean(row) && typeof row === "object" && !Array.isArray(row),
  );
}

function toStampFields(raw: unknown[], signerId: string): SignatureField[] {
  return asFields(raw).map((rec, index) => ({
    id: String(rec.id ?? `f-${index + 1}`),
    kind: normalizeFieldKind(String(rec.type ?? "text")),
    label: String(rec.type ?? "Field"),
    x: Number(rec.x ?? 0),
    y: Number(rec.y ?? 0),
    w: Number(rec.width ?? rec.w ?? 140),
    h: Number(rec.height ?? rec.h ?? 36),
    page: Number(rec.pageNumber ?? rec.page ?? 1) || 1,
    signerId: String(rec.recipientId ?? signerId),
    required: rec.required !== false,
    value: typeof rec.value === "string" ? rec.value : undefined,
    documentId: "primary",
  }));
}

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
  const local = await readPublicSignSession(safeToken);
  if (local?.consumed) {
    return NextResponse.json(
      { error: "This signing link has expired.", expired: true },
      { status: 410 },
    );
  }

  const result = isLocalSignToken(safeToken)
    ? { ok: false, status: 404, data: {} as Record<string, unknown> }
    : await fetchPublicSignature(safeToken, {
        method: "POST",
        body: JSON.stringify(body),
      }, "/sign");
  if (result.ok) {
    return NextResponse.json(result.data);
  }

  if (local) {
    const bodyRec = body as Record<string, unknown>;
    const incomingFields = asFields(bodyRec.fields);
    const currentFields = asFields(local.fields);
    for (const rec of incomingFields) {
      const fieldId = String(rec.fieldId ?? rec.id ?? "");
      if (!fieldId) continue;
      const index = currentFields.findIndex(
        (field) => String(field.id ?? "") === fieldId,
      );
      if (index >= 0) {
        currentFields[index] = {
          ...currentFields[index],
          value: rec.value,
        };
      }
    }

    const signerId = String(
      currentFields[0]?.recipientId ?? `public-${safeToken}`,
    );
    const storedPdf = await readPublicSignDocument(safeToken);
    if (storedPdf && isPdfBytes(new Uint8Array(storedPdf.bytes))) {
      const signer: SignatureSigner = {
        id: signerId,
        name: String(local.recipientName ?? "Signer"),
        email: "",
        order: 1,
        role: "Signer",
        deliveryMethod: "email",
        status: "Signed",
        token: safeToken,
        colorIndex: 0,
      };
      try {
        const stamped = await stampSignedPdfBytes(
          new Uint8Array(storedPdf.bytes),
          toStampFields(currentFields, signerId),
          [signer],
        );
        await writePublicSignDocument(
          safeToken,
          Buffer.from(stamped),
          "application/pdf",
        );
      } catch {
        /* keep the original file if stamping fails */
      }
    }

    await writePublicSignSession(safeToken, {
      ...local,
      fields: currentFields,
      status: "Signed",
      signedAt: new Date().toISOString(),
      consumed: true,
      documentUrl: publicSignDocumentPath(safeToken),
    });
  }
  if (isLocalSignToken(safeToken) || local) {
    return NextResponse.json({ ok: true, status: "Signed", consumed: true });
  }
  return NextResponse.json(result.data, { status: result.status });
}
