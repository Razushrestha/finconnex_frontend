import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readProvideFile } from "@/lib/documents/requests/provide-store";

/** Broker download of a file the client sent. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Session has expired. Sign in again." },
      { status: 401 },
    );
  }
  const url = new URL(request.url);
  const requestId = url.searchParams.get("requestId")?.trim() ?? "";
  const itemId = url.searchParams.get("itemId")?.trim() ?? "";
  const title = url.searchParams.get("title")?.trim() ?? "";
  if (!requestId || !itemId) {
    return NextResponse.json({ error: "Missing document." }, { status: 400 });
  }
  const found = await readProvideFile(requestId, itemId, title);
  if (!found) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(found.bytes), {
    headers: {
      "Content-Type": found.file.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${found.file.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "no-store",
    },
  });
}
