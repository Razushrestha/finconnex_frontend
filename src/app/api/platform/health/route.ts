import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isPlatformAdminRole } from "@/lib/auth/platform";

function crmBaseUrl(): string | null {
  const raw =
    process.env.CRM_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_CRM_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "https://finconnex.payperless.app";
  return raw.replace(/\/$/, "") || null;
}

export async function GET() {
  const session = await getSession();
  if (!session || !isPlatformAdminRole(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const base = crmBaseUrl();
  if (!base) {
    return NextResponse.json(
      { ok: false, status: "unconfigured", detail: "CRM API URL is not set" },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(`${base}/health`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as {
      status?: string;
    } | null;
    const status = body?.status ?? (res.ok ? "ok" : "error");
    return NextResponse.json({
      ok: res.ok && status === "ok",
      status,
      http: res.status,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      status: "unreachable",
      detail: err instanceof Error ? err.message : "Could not reach CRM",
    });
  }
}
