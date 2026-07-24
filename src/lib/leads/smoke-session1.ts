/**
 * Session 1 smoke: live activity index + view-model invariants.
 * Run: npx tsx src/lib/leads/smoke-session1.ts
 */

import { listLeadActivityCandidates } from "@/lib/leads/activity-index";
import {
  pickActivitySummary,
  pickLastCompletedActivity,
  urgencyForCandidate,
} from "@/lib/leads/activity-summary";
import { assertActivitySummaryFixtures } from "@/lib/leads/activity-summary.fixtures";
import { buildLeadCardViewModel } from "@/lib/leads/card-view-model";
import { findLeadById, listLeadColumns } from "@/lib/leads/store";
import type { LeadRecord } from "@/lib/leads/types";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const now = new Date(2026, 6, 23, 12, 0, 0);

function cardToRecord(
  card: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    owner: string;
    createdDate: string;
    source: LeadRecord["source"];
    estimatedValue?: string;
    initials: string;
    accentColorClass: string;
    avatarBgClass: string;
  },
  status: LeadRecord["status"],
): LeadRecord {
  const [firstName, ...rest] = card.name.split(/\s+/);
  return {
    id: card.id,
    leadId: card.id,
    firstName: firstName ?? "",
    lastName: rest.join(" "),
    email: card.email,
    phone: card.phone,
    company: card.company,
    source: card.source,
    status,
    owner: card.owner,
    createdDate: card.createdDate,
    estimatedValue: card.estimatedValue,
    initials: card.initials,
    accentColorClass: card.accentColorClass,
    avatarBgClass: card.avatarBgClass,
  };
}

export function runSmokeSession1() {
  installSmokePolyfill();
  console.log("1) Fixtures…");
  assertActivitySummaryFixtures(now);
  console.log("   OK — fixture suite passed");

  console.log("\n2) Live index (now = 2026-07-23 12:00)…");
  const cols = listLeadColumns();
  const leads = cols.flatMap((c) =>
    c.cards.map((card) => ({ card, status: c.leadStatus })),
  );

  let red = 0;
  let amber = 0;
  let green = 0;
  let empty = 0;
  let invariantOk = true;

  for (const { card, status } of leads) {
    const candidates = listLeadActivityCandidates(card.name, now);
    const summary = pickActivitySummary(candidates, now);
    const last = pickLastCompletedActivity(candidates, now);
    const u = summary.urgency;

    if (u === "red") red += 1;
    else if (u === "amber") amber += 1;
    else if (u === "green") green += 1;
    else empty += 1;

    if (summary.primary === null && summary.moreCount !== 0) {
      console.error("   FAIL +X on empty:", card.name);
      invariantOk = false;
    }
    if (summary.moreCount < 0) {
      console.error("   FAIL negative +X:", card.name);
      invariantOk = false;
    }
    if (
      summary.primary &&
      summary.urgency !== urgencyForCandidate(summary.primary, now)
    ) {
      console.error("   FAIL urgency mismatch:", card.name);
      invariantOk = false;
    }
    if (
      summary.sorted[0] &&
      summary.primary &&
      summary.sorted[0].id !== summary.primary.id
    ) {
      console.error("   FAIL sorted[0] != primary:", card.name);
      invariantOk = false;
    }

    if (summary.primary || last) {
      console.log(
        [
          `   ${card.name.padEnd(22)}`,
          String(status).padEnd(12),
          (u ?? "empty").padEnd(6),
          (summary.primary
            ? `${summary.primary.kind}/${summary.primary.id}`
            : "-"
          ).padEnd(16),
          `+${summary.moreCount}`.padEnd(4),
          (summary.dueLabel || "-").padEnd(20),
          last ? `${last.label} (${last.relativeTime})` : "no last",
        ].join(" "),
      );
    }
  }

  console.log("\n   Board counts:", {
    total: leads.length,
    red,
    amber,
    green,
    empty,
  });

  console.log("\n3) View-model (William Anderson)…");
  const williamCard = leads.find((l) => l.card.name === "William Anderson");
  if (!williamCard) throw new Error("William Anderson missing from board");
  const found = findLeadById(williamCard.card.id);
  if (!found) throw new Error("findLeadById failed for William");
  const record = cardToRecord(
    found.card,
    found.status as LeadRecord["status"],
  );
  const vm = buildLeadCardViewModel(record, {
    now,
    showOwnerAvatar: false,
  });

  console.log("  ", {
    name: vm.name,
    status: vm.status,
    showOwnerAvatar: vm.showOwnerAvatar,
    fields: vm.dynamicFields.map((f) => `${f.key}=${f.value}`),
    summary: vm.activitySummary.primary
      ? {
          id: vm.activitySummary.primary.id,
          kind: vm.activitySummary.primary.kind,
          urgency: vm.activitySummary.urgency,
          more: vm.activitySummary.moreCount,
          due: vm.activitySummary.dueLabel,
          title: vm.activitySummary.primary.title,
        }
      : null,
    last: vm.lastActivity
      ? `${vm.lastActivity.label} ${vm.lastActivity.relativeTime}`
      : null,
    quickActions: vm.quickActions.length,
  });

  if (vm.showOwnerAvatar !== false) {
    console.error("   FAIL owner avatar should default off");
    invariantOk = false;
  }
  if (vm.quickActions.length !== 7) {
    console.error("   FAIL expected 7 quick actions");
    invariantOk = false;
  }
  const quickOrder = vm.quickActions.map((a) => a.kind).join(",");
  if (quickOrder !== "call,sms,email,meeting,task,note,attachment") {
    console.error("   FAIL quick action order:", quickOrder);
    invariantOk = false;
  }
  if (vm.quickActions.some((a) => a.kind === "call" && a.urgency === "green")) {
    console.error("   FAIL Call must never be green");
    invariantOk = false;
  }
  if (vm.activitySummary.urgency !== "red" || vm.activitySummary.moreCount < 1) {
    console.error("   FAIL expected William red summary with +X");
    invariantOk = false;
  }
  if (vm.dynamicFields.length < 1 || vm.dynamicFields.length > 4) {
    console.error("   FAIL dynamic fields cap 1–4");
    invariantOk = false;
  }

  console.log("\n4) Board coverage…", {
    boardLeadCount: leads.length,
    withSummary: red + amber + green,
    emptySummary: empty,
  });
  if (empty < 1) {
    console.error("   FAIL expected at least one empty-summary lead");
    invariantOk = false;
  }
  if (red < 1) {
    console.error("   FAIL expected at least one red summary lead");
    invariantOk = false;
  }

  if (!invariantOk) {
    smokeFail("SMOKE FAILED — session 1 invariants");
  }
  console.log("\nSMOKE OK — lead card data + UI contracts hold");
}

runAsCli(runSmokeSession1);
