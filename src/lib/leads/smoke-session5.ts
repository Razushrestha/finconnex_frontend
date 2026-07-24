/**
 * Session 5 / Phase 7 smoke: seed coverage + hardened invariants.
 * Run: npx tsx src/lib/leads/smoke-session5.ts
 */

import { assertActivitySummaryFixtures } from "@/lib/leads/activity-summary.fixtures";
import { truncateActivityTitle } from "@/lib/leads/activity-summary";
import { ACTIVITY_TITLE_TRUNCATE_AT } from "@/lib/leads/card-types";
import { buildLeadCardViewModelFromCard } from "@/lib/leads/card-view-model";
import { assertLeadCardInvariants } from "@/lib/leads/invariants";
import { DEFAULT_LEAD_CARD_SETTINGS } from "@/lib/leads/lead-card-settings";
import { listLeadColumns } from "@/lib/leads/store";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const now = new Date(2026, 6, 23, 12, 0, 0);
const fail: (msg: string) => never = smokeFail;

export function runSmokeSession5() {
  installSmokePolyfill();
  console.log("1) Ranking fixtures…");
  assertActivitySummaryFixtures(now);
  console.log("   OK");

  console.log("\n2) Board VMs + invariants (now=2026-07-23 12:00)…");
  const vms = listLeadColumns().flatMap((col) =>
    col.cards.map((card) =>
      buildLeadCardViewModelFromCard(card, col.leadStatus, {
        now,
        cardSettings: DEFAULT_LEAD_CARD_SETTINGS,
      }),
    ),
  );

  for (const vm of vms) {
    try {
      assertLeadCardInvariants(vm);
    } catch (e) {
      fail(String(e));
    }
  }
  console.log(`   OK — ${vms.length} cards pass invariants`);

  const byName = Object.fromEntries(vms.map((v) => [v.name, v]));
  const counts = { red: 0, amber: 0, green: 0, empty: 0, withLast: 0 };
  for (const vm of vms) {
    const u = vm.activitySummary.urgency;
    if (u === "red") counts.red += 1;
    else if (u === "amber") counts.amber += 1;
    else if (u === "green") counts.green += 1;
    else counts.empty += 1;
    if (vm.lastActivity) counts.withLast += 1;
  }
  console.log("   Counts:", counts);

  console.log("\n3) Spec example seeds…");
  const william = byName["William Anderson"];
  const chloe = byName["Chloe Ramirez"];
  const jennifer = byName["Jennifer Adams"];
  const arjun = byName["Arjun Mehta"];
  const katherina = byName["Katherina Brooks"];

  if (!william || william.activitySummary.urgency !== "red") {
    fail("William should be red");
  }
  if ((william.activitySummary.moreCount ?? 0) < 2) {
    fail(`William expected +X ≥ 2, got +${william.activitySummary.moreCount}`);
  }
  const wTitle = william.activitySummary.primary!.title;
  if (wTitle.length < 40) fail("William primary should be long-title seed");
  const truncated = truncateActivityTitle(wTitle, ACTIVITY_TITLE_TRUNCATE_AT);
  if (truncated.length > ACTIVITY_TITLE_TRUNCATE_AT || !truncated.endsWith("…")) {
    fail(`truncate failed: "${truncated}"`);
  }
  if (!william.lastActivity) fail("William should have last activity (SMS)");
  console.log("   William:", {
    urgency: william.activitySummary.urgency,
    more: william.activitySummary.moreCount,
    truncated,
    last: william.lastActivity.relativeTime,
  });

  if (!chloe || chloe.activitySummary.urgency !== "red") {
    fail("Chloe should be red (missed)");
  }
  if (!chloe.activitySummary.primary?.isMissed) {
    fail("Chloe primary should be missed call");
  }
  console.log("   Chloe: missed", chloe.activitySummary.dueLabel);

  if (!jennifer || jennifer.activitySummary.urgency !== "amber") {
    fail(
      `Jennifer should be amber, got ${jennifer?.activitySummary.urgency ?? "missing"}`,
    );
  }
  console.log("   Jennifer:", {
    id: jennifer.activitySummary.primary?.id,
    due: jennifer.activitySummary.dueLabel,
  });

  if (!arjun || arjun.activitySummary.urgency !== "green") {
    fail(
      `Arjun should be green, got ${arjun?.activitySummary.urgency ?? "missing"}`,
    );
  }
  console.log("   Arjun:", {
    id: arjun.activitySummary.primary?.id,
    title: arjun.activitySummary.primary?.title,
    due: arjun.activitySummary.dueLabel,
  });

  if (!katherina) fail("Katherina missing");
  if (katherina.activitySummary.primary !== null) {
    fail("Katherina should have empty Activity Summary (§12)");
  }
  if (!katherina.lastActivity) {
    fail("Katherina should show last activity from completed call");
  }
  console.log("   Katherina: empty summary +", katherina.lastActivity.label);

  if (counts.red < 1 || counts.amber < 1 || counts.green < 1 || counts.empty < 1) {
    fail("Board must cover red, amber, green, and empty summary");
  }
  if (counts.withLast < 2) fail("expected ≥2 cards with last activity");

  console.log("\nSMOKE OK — Session 5 (harden + seeds) complete");
}

runAsCli(runSmokeSession5);
