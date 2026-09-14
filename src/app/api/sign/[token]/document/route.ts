import { NextResponse } from "next/server";

function pickStr(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function crmBase() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.CRM_API_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const safeToken = token?.trim();
  if (!safeToken) {
    return NextResponse.json({ documentUrl: null }, { status: 400 });
  }

  const base = crmBase();
  if (!base) {
    return NextResponse.json({ documentUrl: null });
  }

  try {
    const res = await fetch(
      `${base}/v1/public/signatures/${encodeURIComponent(safeToken)}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const data =
      json.data && typeof json.data === "object"
        ? (json.data as Record<string, unknown>)
        : json;
    const documentUrl = pickStr(
      data.documentUrl,
      data.fileUrl,
      data.url,
      data.documentFileUrl,
    );
    return NextResponse.json({ documentUrl: documentUrl || null });
  } catch {
    return NextResponse.json({ documentUrl: null });
  }
}
