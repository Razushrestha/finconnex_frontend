import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readLocalUpload } from "@/lib/storage/local-fallback";

type Ctx = { params: Promise<{ id: string; name: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Sign in to continue" }, { status: 401 });
  }
  const { id, name } = await ctx.params;
  if (!id || !name || id.includes("..") || name.includes("..")) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const fileName = decodeURIComponent(name);
  try {
    const bytes = await readLocalUpload(id, fileName);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`,
      },
    });
  } catch {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
}
