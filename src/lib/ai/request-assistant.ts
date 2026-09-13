export type AssistantTurn = { role: "user" | "assistant"; text: string };

export async function requestAssistantReply(
  messages: AssistantTurn[],
): Promise<{ text: string; href?: string }> {
  const res = await fetch("/api/ai/assistant", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    text?: string;
    href?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(json.error || "The AI assistant could not reply.");
  }
  const text = json.text?.trim();
  if (!text) throw new Error("The AI assistant returned an empty reply.");
  return {
    text,
    href: json.href?.startsWith("/") ? json.href : undefined,
  };
}
