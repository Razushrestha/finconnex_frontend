type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
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
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemini-flash-latest",
].filter((value): value is string => Boolean(value));

function cleanDraft(text: string) {
  return text
    .replace(/^```(?:html|markdown)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

async function generateWithModel(model: string, prompt: string, key: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as GeminiResponse;
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
}

export async function generateGeminiText(prompt: string): Promise<string> {
  const key = geminiKey();
  if (!key) {
    throw new Error("Google AI Studio is not configured on this server.");
  }

  const tried = new Set<string>();
  const errors: string[] = [];

  for (const model of MODELS) {
    if (tried.has(model)) continue;
    tried.add(model);
    const result = await generateWithModel(model, prompt, key);
    if (result.ok && result.text) return result.text;
    errors.push(`${model}: ${result.error}`);
  }

  throw new Error(errors[0] || "Gemini did not return a draft.");
}
