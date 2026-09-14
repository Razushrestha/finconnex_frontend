import { NextResponse } from "next/server";
import {
  generateGeminiSignatureImage,
  isGeminiConfigured,
  SIGNATURE_AI_STYLES,
  type SignatureAiStyle,
} from "@/lib/emails/gemini-server";

type Body = {
  name?: string;
  style?: string;
};

function isSignatureStyle(value: string): value is SignatureAiStyle {
  return (SIGNATURE_AI_STYLES as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Set GEMINI_API_KEY in .env.local, then restart the app." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const name = (body.name ?? "").replace(/[<>]/g, "").trim().slice(0, 80);
  const style = (body.style ?? "executive").trim();

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Enter the name to use in the AI signature." },
      { status: 400 },
    );
  }
  if (!isSignatureStyle(style)) {
    return NextResponse.json({ error: "Choose a signature style." }, { status: 400 });
  }

  try {
    const dataUrl = await generateGeminiSignatureImage({ name, style });
    return NextResponse.json({ dataUrl });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Google AI could not generate this signature.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
