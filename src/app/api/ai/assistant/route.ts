import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  generateGeminiText,
  isGeminiConfigured,
} from "@/lib/emails/gemini-server";

type ChatMessage = { role?: string; text?: string };

const ROUTES = [
  "/ — Dashboard",
  "/work-queue — Work queue",
  "/sales/leads — Leads",
  "/sales/leads/create — New lead",
  "/sales/contacts — Contacts",
  "/sales/contacts/create — New contact",
  "/sales/deals — Deals",
  "/sales/deals/create — New deal",
  "/sales/companies — Companies",
  "/activities/tasks — Tasks",
  "/activities/tasks/create — New task",
  "/activities/meetings — Meetings",
  "/activities/meetings/create — New appointment",
  "/activities/emails — Emails",
  "/activities/emails/create — Compose email",
  "/activities/calls — Calls",
  "/activities/reminders — Reminders",
  "/activities/notes — Notes",
  "/marketing/inbox — Inbox",
  "/documents/requests — Document requests",
  "/settings — Settings",
  "/users — Users",
];

function instruction(messages: ChatMessage[]) {
  const history = messages
    .filter((row) => row.text?.trim())
    .slice(-10)
    .map((row) => `${row.role === "user" ? "User" : "Assistant"}: ${row.text!.trim()}`)
    .join("\n");

  return [
    "You are the FinConnex CRM assistant for Australian mortgage and finance brokers.",
    "Help the signed-in user find records, draft follow-ups, explain screens, and jump to the right module.",
    "Be concise (2–6 short sentences). Do not invent client data, balances, or that a record exists if you were not given it.",
    "Do not mention API keys, models, or that you are Gemini unless asked.",
    "Known in-app paths:",
    ROUTES.join("\n"),
    "If the user clearly wants to open or create something, end your reply with exactly one extra line in this form:",
    "NAVIGATE:/sales/leads",
    "Use only a path from the list. If they are not asking to go somewhere, do not include NAVIGATE.",
    "",
    "Conversation:",
    history || "User: Hello",
    "",
    "Assistant:",
  ].join("\n");
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to use the AI assistant." }, { status: 401 });
  }
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Set GEMINI_API_KEY in .env.local, then restart the app." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    messages?: ChatMessage[];
  };
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.some((row) => row.role === "user" && row.text?.trim())) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }

  try {
    const raw = await generateGeminiText(instruction(messages));
    const nav = raw.match(/^NAVIGATE:(\/[^\s]+)\s*$/m);
    const href = nav?.[1]?.startsWith("/") ? nav[1].trim() : undefined;
    const text = raw.replace(/\n?NAVIGATE:\/[^\s]+\s*$/m, "").trim() || raw.trim();
    return NextResponse.json({ text, href });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Google AI could not answer.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
