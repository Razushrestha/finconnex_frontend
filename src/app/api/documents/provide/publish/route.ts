import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  defaultProvideExpiryMs,
  provideAbsoluteUrl,
  sealPublicProvideSession,
  type PublicProvideDocItem,
} from "@/lib/documents/requests/public-provide";

/**
 * Seals a public "provide documents" link for the signed-in broker to email
 * to the client. Token carries the request snapshot so the client does not
 * need CRM login.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Session has expired. Sign in again." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    requestId?: string;
    title?: string;
    clientName?: string;
    clientEmail?: string;
    dueDate?: string;
    notes?: string;
    items?: Array<{
      id?: string;
      title?: string;
      description?: string;
      applicant?: string;
    }>;
  };

  const clientEmail = String(body.clientEmail ?? "")
    .trim()
    .toLowerCase();
  if (!clientEmail.includes("@")) {
    return NextResponse.json(
      { error: "A valid client email is required." },
      { status: 400 },
    );
  }

  const items: PublicProvideDocItem[] = (body.items ?? [])
    .map((row, index) => ({
      id: String(row.id ?? `doc-${index + 1}`).trim() || `doc-${index + 1}`,
      title: String(row.title ?? "").trim() || `Document ${index + 1}`,
      description: String(row.description ?? "").trim() || undefined,
      applicant: String(row.applicant ?? "").trim() || undefined,
    }))
    .filter((row) => row.title);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Select at least one document to request." },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const token = sealPublicProvideSession({
    requestId: String(body.requestId ?? "").trim() || `local-${Date.now()}`,
    title: String(body.title ?? "").trim() || "Document request",
    clientName:
      String(body.clientName ?? "").trim() || clientEmail.split("@")[0] || "Client",
    clientEmail,
    brokerName: session.name?.trim() || "Your broker",
    brokerEmail: session.email?.trim() || "",
    dueDate: String(body.dueDate ?? "").trim() || undefined,
    notes: String(body.notes ?? "").trim() || undefined,
    items,
    exp: defaultProvideExpiryMs(),
  });

  return NextResponse.json({
    token,
    url: provideAbsoluteUrl(token, origin),
  });
}
