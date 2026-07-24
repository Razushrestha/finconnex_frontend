/**
 * Session 3 smoke: quick-action persistence + panel ranking order.
 * Run: npx tsx src/lib/leads/smoke-session3.ts
 *
 * Uses an isolated extras key simulation via direct submit + index merge.
 */

import { assertActivitySummaryFixtures } from "@/lib/leads/activity-summary.fixtures";
import { listLeadActivityCandidates } from "@/lib/leads/activity-index";
import { pickActivitySummary } from "@/lib/leads/activity-summary";
import {
  addLeadExtra,
  extrasToCandidates,
  listLeadExtras,
} from "@/lib/leads/lead-extras-store";
import { submitLeadQuickAction } from "@/lib/leads/panel-actions";
import { buildLeadCardViewModelFromCard } from "@/lib/leads/card-view-model";
import { listLeadColumns } from "@/lib/leads/store";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const now = new Date(2026, 6, 23, 12, 0, 0);
const fail: (msg: string) => never = smokeFail;

export async function runSmokeSession3() {
  installSmokePolyfill();
  console.log("1) Ranking fixtures…");
  assertActivitySummaryFixtures(now);
  console.log("   OK");

  console.log("\n2) Extras store merge…");
  const lead = "Arjun Mehta";
  addLeadExtra({
    leadName: lead,
    kind: "meeting",
    title: "Discovery appointment",
    dueAt: new Date(2026, 6, 24, 10, 0).toISOString(),
    createdAt: new Date().toISOString(),
    bucket: "scheduled",
  });
  const extras = extrasToCandidates(lead);
  if (extras.length < 1) fail("extras not listed");
  const summary = pickActivitySummary(
    listLeadActivityCandidates(lead, now),
    now,
  );
  if (summary.primary?.title !== "Discovery appointment") {
    fail(`expected green/future meeting primary, got ${summary.primary?.title}`);
  }
  if (summary.urgency !== "green") {
    fail(`expected green urgency, got ${summary.urgency}`);
  }
  console.log("   Arjun summary:", {
    id: summary.primary?.id,
    urgency: summary.urgency,
    due: summary.dueLabel,
  });

  console.log("\n3) Quick-action submit helpers…");
  const sms = await submitLeadQuickAction("sms", lead, {
    title: "Ping",
    body: "Hi Arjun — following up",
    date: "2026-07-24",
    time: "10:00",
    priority: "Medium",
    assignedTo: "John Smith",
  });
  if (!sms.ok) fail(sms.message);

  const note = await submitLeadQuickAction("note", lead, {
    title: "",
    body: "Interested in refinance options",
    date: "2026-07-24",
    time: "10:00",
    priority: "Medium",
    assignedTo: "John Smith",
  });
  if (!note.ok) fail(note.message);

  const candidates = listLeadActivityCandidates(lead, now);
  const completedNotes = candidates.filter(
    (c) => c.kind === "note" && c.bucket === "completed",
  );
  if (completedNotes.length < 1) fail("note not in index as completed");

  const vmCard = listLeadColumns()
    .flatMap((c) => c.cards.map((card) => ({ card, status: c.leadStatus })))
    .find((x) => x.card.name === lead);
  if (!vmCard) fail("Arjun card missing");
  const vm = buildLeadCardViewModelFromCard(vmCard.card, vmCard.status, {
    now,
  });
  if (!vm.lastActivity) fail("expected last activity after note/sms");
  console.log("   Last activity:", vm.lastActivity.label, vm.lastActivity.relativeTime);

  console.log("\n4) Summary panel order invariant…");
  const sorted = pickActivitySummary(candidates, now).sorted;
  for (let i = 1; i < sorted.length; i++) {
    // broken must precede scheduled
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (prev.bucket === "scheduled" && cur.bucket === "broken") {
      fail("sorted list places scheduled before broken");
    }
  }
  console.log("   pending count:", sorted.length, "extras:", listLeadExtras(lead).length);

  console.log("\nSMOKE OK — Session 3 ready for Session 4/5");
}

runAsCli(runSmokeSession3);
