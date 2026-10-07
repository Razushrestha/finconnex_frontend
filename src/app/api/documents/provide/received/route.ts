import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listProvideBundles } from "@/lib/documents/requests/provide-store";

/** Files clients have sent from their upload link. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Session has expired. Sign in again." },
      { status: 401 },
    );
  }
  const bundles = await listProvideBundles();
  return NextResponse.json({ bundles });
}
