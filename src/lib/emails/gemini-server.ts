type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; mimeType?: string; data?: string };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<GeminiPart> };
  }>;
  error?: { message?: string };
};

function geminiKey(): string {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    ""
  );
}

export function isGeminiConfigured() {
  return geminiKey().length > 0;
}

/** Prefer current Flash IDs. 2.5/2.0 return 404 for new AI Studio keys. */
const MODELS = [
  process.env.GEMINI_MODEL?.trim(),
  "gemini-flash-latest",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
].filter((value): value is string => Boolean(value));

function cleanDraft(text: string) {
  return text
    .replace(/^```(?:html|markdown)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

async function geminiFetch(url: string, key: string, body: unknown, timeoutMs: number) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = (await res.json().catch(() => ({}))) as GeminiResponse;
  return { res, json };
}

async function generateWithModel(
  model: string,
  prompt: string,
  key: string,
  opts?: { maxOutputTokens?: number; timeoutMs?: number },
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  try {
    const { res, json } = await geminiFetch(
      url,
      key,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: opts?.maxOutputTokens ?? 1024,
        },
      },
      opts?.timeoutMs ?? 12_000,
    );
    const text = json.candidates
      ?.flatMap((row) => row.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("\n")
      .trim();
    return {
      ok: res.ok,
      status: res.status,
      text: text ? cleanDraft(text) : "",
      error: json.error?.message || `Gemini request failed (${res.status})`,
    };
  } catch (err) {
    const aborted =
      err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return {
      ok: false,
      status: 0,
      text: "",
      error: aborted ? `${model} timed out` : `Gemini request failed (${model})`,
    };
  }
}

const IMAGE_MODELS = [
  process.env.GEMINI_IMAGE_MODEL?.trim(),
  "gemini-2.5-flash-image",
].filter((value): value is string => Boolean(value));

function partInline(part: GeminiPart): { mimeType: string; data: string } | null {
  const inline = part.inlineData || part.inline_data;
  const data = inline?.data?.trim();
  if (!data) return null;
  const mimeType =
    inline && "mimeType" in inline && inline.mimeType
      ? inline.mimeType
      : inline && "mime_type" in inline
        ? (inline as { mime_type?: string }).mime_type || "image/png"
        : "image/png";
  return { mimeType, data };
}

async function generateImageWithModel(
  model: string,
  prompt: string,
  key: string,
  responseModalities: string[],
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  try {
    const { res, json } = await geminiFetch(
      url,
      key,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities,
          imageConfig: { aspectRatio: "16:9" },
        },
      },
      8_000,
    );
    const parts = json.candidates?.flatMap((row) => row.content?.parts ?? []) ?? [];
    const image = parts.map(partInline).find((row) => row != null);
    return {
      ok: res.ok,
      status: res.status,
      dataUrl: image ? `data:${image.mimeType};base64,${image.data}` : "",
      error: json.error?.message || `Gemini image request failed (${res.status})`,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      dataUrl: "",
      error: `${model} timed out`,
    };
  }
}

function extractSvg(text: string): string | null {
  const cleaned = text
    .replace(/^```(?:svg|xml|html)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const match = cleaned.match(/<svg[\s\S]*<\/svg>/i);
  if (!match) return null;
  const svg = match[0]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SIGNATURE_AI_STYLES = [
  "executive",
  "minimal",
  "artistic",
  "seal",
] as const;

export type SignatureAiStyle = (typeof SIGNATURE_AI_STYLES)[number];

const SIGNATURE_STYLE_HINT: Record<SignatureAiStyle, string> = {
  executive:
    "formal executive fountain-pen calligraphy, even pressure, slightly right-slanted, suitable for a legal document",
  minimal:
    "modern minimalist signature with few confident strokes and no extra loops",
  artistic:
    "expressive artistic handwriting with a balanced flourish on the last letter",
  seal:
    "official handwritten signature with a confident underline flourish; still pen writing, not a rubber stamp",
};

function signatureImagePrompt(name: string, style: SignatureAiStyle) {
  return [
    "Generate one PNG image of a realistic handwritten personal signature.",
    `The signature must clearly read: "${name}".`,
    `Style: ${SIGNATURE_STYLE_HINT[style]}.`,
    "Black ink only (#000000) on a transparent or pure white background.",
    "Landscape, wide, like a signature pad. No paper texture, no logos, no date, no extra words, no borders, no watermark, no photorealistic hand.",
    "It must look like real human pen strokes, not a computer font.",
  ].join(" ");
}

function signatureSvgPrompt(name: string, style: SignatureAiStyle) {
  return [
    "Return only SVG markup. The first character must be < and the last tag must be </svg>.",
    "No markdown, no code fences, no explanation.",
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 180" width="640" height="180">',
    `Handwritten signature that reads exactly: ${name}`,
    `Style: ${SIGNATURE_STYLE_HINT[style]}.`,
    'Use <text> with font-family="cursive" italic and one underline <path>. Fill #000000.',
    "No script tags, no images, no extra words.",
  ].join("\n");
}

function nameSignatureSvg(name: string) {
  const safe = name
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 180" width="640" height="180"><text x="24" y="100" fill="#000000" font-family="cursive, 'Segoe Script', 'Brush Script MT', serif" font-style="italic" font-size="54">${safe}</text><path d="M28 128 Q 220 158 612 118" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function generateGeminiSignatureImage(input: {
  name: string;
  style: SignatureAiStyle;
}): Promise<string> {
  const key = geminiKey();
  if (!key) {
    throw new Error("Google AI Studio is not configured on this server.");
  }

  const imageModel = IMAGE_MODELS[0];
  if (imageModel) {
    const image = await generateImageWithModel(
      imageModel,
      signatureImagePrompt(input.name, input.style),
      key,
      ["TEXT", "IMAGE"],
    );
    if (image.dataUrl) return image.dataUrl;
  }

  try {
    const svgText = await generateGeminiText(
      signatureSvgPrompt(input.name, input.style),
      { maxOutputTokens: 2048, timeoutMs: 12_000 },
    );
    const svg = extractSvg(svgText);
    if (svg) return svg;
  } catch {
    /* use name SVG below */
  }

  return nameSignatureSvg(input.name);
}

export async function generateGeminiText(
  prompt: string,
  opts?: { maxOutputTokens?: number; timeoutMs?: number },
): Promise<string> {
  const key = geminiKey();
  if (!key) {
    throw new Error("Google AI Studio is not configured on this server.");
  }

  const tried = new Set<string>();
  const errors: string[] = [];

  for (const model of MODELS) {
    if (tried.has(model)) continue;
    tried.add(model);
    const result = await generateWithModel(model, prompt, key, opts);
    if (result.ok && result.text) return result.text;
    errors.push(`${model}: ${result.error}`);
    if (result.status === 0) break;
  }

  throw new Error(errors[0] || "Gemini did not return a draft.");
}
