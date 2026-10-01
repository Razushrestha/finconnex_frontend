import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readCrmComposeSignature } from "@/lib/emails/signature-crm";
import { readEmailSignatureFile } from "@/lib/emails/signature-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to use signatures." }, { status: 401 });
  }
  const { id } = await context.params;
  const local = await readEmailSignatureFile(session.userId, id);
  const file = local
    ? { mime: local.row.mime, bytes: local.bytes }
    : await readCrmComposeSignature(id);
  if (!file) {
    return NextResponse.json({ error: "Signature not found." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "private, max-age=31536000",
    },
  });
}
