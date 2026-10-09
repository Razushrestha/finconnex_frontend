import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { getAuthSecretKey, SESSION_COOKIE } from "@/lib/auth/constants";
import { isAllowedOneDriveDownloadUrl } from "@/lib/documents/onedrive/files";

const MAX_BYTES = 25 * 1024 * 1024;

function sessionToken(request: Request): string {
  const header = request.headers.get("cookie") ?? "";
  const match = header.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`),
  );
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

/** Downloads a file the OneDrive chooser returned, when the browser blocks that host. */
export async function POST(request: Request) {
  const token = sessionToken(request);
  if (!token) {
    return NextResponse.json({ error: "Sign in to add a OneDrive file." }, { status: 401 });
  }
  try {
    await jwtVerify(token, getAuthSecretKey());
  } catch {
    return NextResponse.json({ error: "Sign in to add a OneDrive file." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That OneDrive link cannot be downloaded." }, { status: 400 });
  }
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const url = typeof record.url === "string" ? record.url : "";
  if (!isAllowedOneDriveDownloadUrl(url)) {
    return NextResponse.json({ error: "That OneDrive link cannot be downloaded." }, { status: 400 });
  }

  const upstream = await fetch(url, { redirect: "follow" });
  if (!upstream.ok) {
    return NextResponse.json({ error: "OneDrive did not return that file." }, { status: 502 });
  }
  const bytes = await upstream.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "That OneDrive file is larger than 25 MB." }, { status: 413 });
  }
  return new NextResponse(bytes, {
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}
