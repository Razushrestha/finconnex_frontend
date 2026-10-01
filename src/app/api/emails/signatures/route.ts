import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  listCrmComposeSignatures,
  saveCrmComposeSignature,
} from "@/lib/emails/signature-crm";
import {
  listEmailSignatures,
  saveEmailSignature,
} from "@/lib/emails/signature-store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to use signatures." }, { status: 401 });
  }
  const [crm, local] = await Promise.all([
    listCrmComposeSignatures(),
    listEmailSignatures(session.userId),
  ]);
  const remote = crm ?? [];
  const seen = new Set(remote.map((item) => item.id));
  const signatures = [
    ...remote,
    ...local.filter((item) => !seen.has(item.id)),
  ];
  return NextResponse.json({ signatures });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to save a signature." }, { status: 401 });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload a signature image." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }
  try {
    const remote = await saveCrmComposeSignature(file);
    const signature = remote ?? (await saveEmailSignature(session.userId, file));
    return NextResponse.json({ signature });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save the signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
