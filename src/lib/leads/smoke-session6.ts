/**
 * Session 6 / P0 smoke: live stores + create + deep-link hrefs.
 * Run: npx tsx src/lib/leads/smoke-session6.ts
 */

import { createCall, listCalls, findCallById } from "@/lib/calls/store";
import { createMeeting, listMeetings, findMeetingById } from "@/lib/meetings/store";
import { createMessage, listMessages, findMessageById } from "@/lib/messages/store";
import { createEmail, listEmails, findEmailById } from "@/lib/emails/store";
import { createNote, listNotes, findNoteById } from "@/lib/notes/store";
import { listLeadActivityCandidates, hrefForLeadActivity } from "@/lib/leads/activity-index";
import { pickActivitySummary, pickLastCompletedActivity } from "@/lib/leads/activity-summary";
import { leadCreateHref, submitLeadQuickAction } from "@/lib/leads/panel-actions";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const fail: (msg: string) => never = smokeFail;

export async function runSmokeSession6() {
  installSmokePolyfill();
  const lead = "Smoke Test Lead";
  const now = new Date(2026, 6, 23, 12, 0, 0);

  console.log("1) Create into live stores…");
  const call = createCall({
    subject: "Smoke call",
    relatedTo: `Lead: ${lead}`,
    contact: lead,
    callType: "Outbound",
    status: "Scheduled",
    date: "24/07/2026 10:00 AM",
    assignedTo: "John Smith",
  });
  const meeting = createMeeting({
    title: "Smoke meeting",
    relatedTo: `Lead: ${lead}`,
    type: "Video Call",
    startDateTime: "25/07/2026 11:00 AM",
    endDateTime: "25/07/2026 12:00 PM",
    organizer: "John Smith",
  });
  const msg = createMessage({
    type: "External",
    subject: "Smoke SMS",
    body: "Hello",
    from: "John Smith",
    to: lead,
    relatedTo: `Lead: ${lead}`,
    status: "Sent",
    sentDate: "23/07/2026 01:00 PM",
  });
  const email = createEmail({
    subject: "Smoke email",
    body: "Body",
    from: "John Smith",
    to: ["smoke@example.com"],
    relatedTo: `Lead: ${lead}`,
    status: "Sent",
    sentDate: "23/07/2026 01:05 PM",
  });
  const note = createNote({
    title: "Smoke note",
    body: "Noted",
    relatedTo: `Lead: ${lead}`,
    createdBy: "John Smith",
  });

  if (!findCallById(call.id)) fail("call not findable");
  if (!findMeetingById(meeting.id)) fail("meeting not findable");
  if (!findMessageById(msg.id)) fail("message not findable");
  if (!findEmailById(email.id)) fail("email not findable");
  if (!findNoteById(note.id)) fail("note not findable");
  console.log("   OK —", {
    calls: listCalls().length,
    meetings: listMeetings().length,
    messages: listMessages().length,
    emails: listEmails().length,
    notes: listNotes().length,
  });

  console.log("\n2) Activity index sees live records…");
  const candidates = listLeadActivityCandidates(lead, now);
  const ids = new Set(candidates.map((c) => c.id));
  for (const id of [call.id, meeting.id, msg.id, email.id, note.id]) {
    if (!ids.has(id)) fail(`candidate missing ${id}`);
  }
  const summary = pickActivitySummary(candidates, now);
  if (!summary.primary) fail("expected pending summary");
  const last = pickLastCompletedActivity(candidates, now);
  if (!last) fail("expected last activity");
  console.log("   primary:", summary.primary.kind, summary.urgency, "+"+summary.moreCount);
  console.log("   last:", last.label);

  console.log("\n3) Deep-link hrefs…");
  for (const c of candidates.filter((x) =>
    ["call", "meeting", "sms", "email", "note"].includes(x.kind),
  )) {
    const href = hrefForLeadActivity(c);
    if (!href || !href.includes("focus=")) fail(`bad href for ${c.id}`);
  }
  console.log("   OK");

  console.log("\n4) Prefill create hrefs…");
  const href = leadCreateHref("call", "William Anderson");
  if (!href.includes("relatedKind=Lead") || !href.includes("relatedName=")) {
    fail("create href missing related params");
  }
  console.log("   ", href);

  console.log("\n5) Quick-action submit → store…");
  const qa = await submitLeadQuickAction(
    "call",
    "Arjun Mehta",
    {
      title: "QA call",
      body: "",
      date: "2026-07-26",
      time: "09:00",
      priority: "Medium",
      assignedTo: "Tejas Gokhe",
    },
  );
  if (!qa.ok || !qa.id) fail(qa.ok ? "missing id" : qa.message);
  if (!findCallById(qa.id)) fail("quick action call not in store");
  console.log("   OK —", qa.message, qa.id);

  console.log("\nSMOKE OK — Session 6 P0 persistence + deep-links");
}

runAsCli(runSmokeSession6);
