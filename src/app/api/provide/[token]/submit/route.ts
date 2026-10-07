import { NextResponse } from "next/server";
import { openPublicProvideSession } from "@/lib/documents/requests/public-provide";
import { saveProvideFiles } from "@/lib/documents/requests/provide-store";

type Ctx = { params: Promise<{ token: string }> };

/**
 * Client sends every requested file at once. Files are stored for the
 * dashboard. The sealed token is the auth — no CRM login.
 */
export async function POST(request: Request, ctx: Ctx) {
  const { token: raw } = await ctx.params;
  let token = raw?.trim() ?? "";
  try {
    token = decodeURIComponent(token);
  } catch {
    /* already decoded */
  }

  const session = openPublicProvideSession(token);
  if (!session) {
    return NextResponse.json(
      { error: "This upload link is invalid or has expired." },
      { status: 404 },
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const itemIds = form.getAll("itemId").map((value) => String(value).trim());
  const uploads = form.getAll("file");
  if (itemIds.length === 0 || itemIds.length !== uploads.length) {
    return NextResponse.json(
      { error: "Choose a file for each document, then send." },
      { status: 400 },
    );
  }
  if (itemIds.length < session.items.length) {
    return NextResponse.json(
      { error: "Upload every requested document before sending." },
      { status: 400 },
    );
  }

  const files: Array<{
    itemId: string;
    title: string;
    fileName: string;
    contentType: string;
    uploadedAt: string;
    bytes: Buffer;
  }> = [];
  const seen = new Set<string>();
  for (let index = 0; index < itemIds.length; index += 1) {
    const itemId = itemIds[index];
    const item =
      session.items.find((row) => row.id === itemId) ??
      session.items.find((row) => row.title === itemId) ??
      null;
    if (!item || seen.has(item.id)) {
      return NextResponse.json(
        { error: "Unknown document on this request." },
        { status: 400 },
      );
    }
    const file = uploads[index];
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    }
    if (file.size > 12 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Each file must be 12 MB or smaller." },
        { status: 400 },
      );
    }
    seen.add(item.id);
    files.push({
      itemId: item.id,
      title: item.title,
      fileName: (file.name || `${item.title}.bin`).replace(/[^\w.\- ()]+/g, "_"),
      contentType: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      bytes: Buffer.from(await file.arrayBuffer()),
    });
  }

  if (seen.size < session.items.length) {
    return NextResponse.json(
      { error: "Upload every requested document before sending." },
      { status: 400 },
    );
  }

  try {
    await saveProvideFiles({
      requestId: session.requestId,
      requestedCount: session.items.length,
      files,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the documents";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    files: files.map((file) => ({
      itemId: file.itemId,
      title: file.title,
      fileName: file.fileName,
    })),
  });
}
