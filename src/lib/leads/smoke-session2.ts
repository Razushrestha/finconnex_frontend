/**
 * Session 2 smoke: LeadCard view-model + UI contracts.
 * Run: npx tsx src/lib/leads/smoke-session2.ts
 */

import { assertActivitySummaryFixtures } from "@/lib/leads/activity-summary.fixtures";
import {
  pickActivitySummary,
  truncateActivityTitle,
} from "@/lib/leads/activity-summary";
import { listLeadActivityCandidates } from "@/lib/leads/activity-index";
import {
  ACTIVITY_TITLE_TRUNCATE_AT,
  type LeadCardViewModel,
} from "@/lib/leads/card-types";
import { buildLeadCardViewModelFromCard } from "@/lib/leads/card-view-model";
import { listLeadColumns } from "@/lib/leads/store";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const now = new Date(2026, 6, 23, 12, 0, 0);
const QUICK_ORDER = "call,sms,email,meeting,task,note,attachment";
const fail: (msg: string) => never = smokeFail;

function checkVm(vm: LeadCardViewModel, label: string) {
  if (!vm.name.trim()) fail(`${label}: empty name`);
  if (!vm.status) fail(`${label}: missing status`);
  if (vm.showOwnerAvatar !== false && label.includes("default")) {
    fail(`${label}: owner avatar should default off`);
  }
  if (vm.dynamicFields.length > 4) {
    fail(`${label}: dynamic fields > 4 (${vm.dynamicFields.length})`);
  }
  for (const f of vm.dynamicFields) {
    if (!f.value.trim()) fail(`${label}: empty dynamic field ${f.key}`);
  }

  const s = vm.activitySummary;
  if (s.primary === null) {
    if (s.moreCount !== 0) fail(`${label}: +X on empty summary`);
    if (s.urgency !== null) fail(`${label}: urgency on empty summary`);
  } else {
    if (!s.urgency) fail(`${label}: missing urgency with primary`);
    if (!s.dueLabel) fail(`${label}: missing dueLabel`);
    if (s.sorted[0]?.id !== s.primary.id) {
      fail(`${label}: sorted[0] != primary`);
    }
    const truncated = truncateActivityTitle(
      s.primary.title,
      ACTIVITY_TITLE_TRUNCATE_AT,
    );
    if (truncated.length > ACTIVITY_TITLE_TRUNCATE_AT) {
      fail(`${label}: title truncate over cap`);
    }
  }

  if (vm.quickActions.length !== 7) {
    fail(`${label}: expected 7 quick actions, got ${vm.quickActions.length}`);
  }
  const order = vm.quickActions.map((a) => a.kind).join(",");
  if (order !== QUICK_ORDER) fail(`${label}: quick order ${order}`);

  for (const a of vm.quickActions) {
    if (
      (a.kind === "call" || a.kind === "sms" || a.kind === "email") &&
      a.urgency === "green"
    ) {
      fail(`${label}: ${a.kind} must never be green`);
    }
    if (a.kind === "note" || a.kind === "attachment") {
      if (a.urgency !== "neutral" || a.badgeCount !== 0) {
        fail(`${label}: ${a.kind} must stay neutral`);
      }
    }
    if (a.badgeCount > 0 && a.badgeCount < 2) {
      fail(`${label}: badge must be 0 or ≥2`);
    }
  }
}

export function runSmokeSession2() {
  installSmokePolyfill();
  console.log("1) Ranking fixtures…");
  assertActivitySummaryFixtures(now);
  console.log("   OK");

  console.log("\n2) Board view-models (UI contracts)…");
  const cols = listLeadColumns();
  const vms: { vm: LeadCardViewModel; column: string }[] = [];

  for (const col of cols) {
    for (const card of col.cards) {
      const vm = buildLeadCardViewModelFromCard(card, col.leadStatus, {
        now,
        showOwnerAvatar: false,
      });
      checkVm(vm, `${card.name} (default)`);
      vms.push({ vm, column: col.title });
    }
  }

  let red = 0;
  let amber = 0;
  let green = 0;
  let empty = 0;
  let withLast = 0;
  let ownerOff = 0;

  for (const { vm } of vms) {
    if (vm.showOwnerAvatar === false) ownerOff += 1;
    if (vm.lastActivity) withLast += 1;
    const u = vm.activitySummary.urgency;
    if (u === "red") red += 1;
    else if (u === "amber") amber += 1;
    else if (u === "green") green += 1;
    else empty += 1;

    if (vm.activitySummary.primary) {
      console.log(
        [
          `   ${vm.name.padEnd(22)}`,
          vm.status.padEnd(12),
          u!.padEnd(6),
          `${vm.activitySummary.primary.kind}/${vm.activitySummary.primary.id}`.padEnd(
            16,
          ),
          `+${vm.activitySummary.moreCount}`.padEnd(4),
          vm.activitySummary.dueLabel.padEnd(18),
          `fields=${vm.dynamicFields.length}`,
          `call=${vm.quickActions.find((a) => a.kind === "call")?.urgency}`,
          `task=${vm.quickActions.find((a) => a.kind === "task")?.urgency}`,
        ].join(" "),
      );
    }
  }

  console.log("\n   Counts:", {
    total: vms.length,
    red,
    amber,
    green,
    emptySummary: empty,
    withLastActivity: withLast,
    ownerAvatarOff: ownerOff,
  });

  if (vms.length < 1) fail("no leads on board");
  if (ownerOff !== vms.length) fail("owner avatar not off by default for all");
  if (red < 1) fail("expected ≥1 red summary card");
  if (empty < 1) fail("expected ≥1 empty summary card (§12)");

  console.log("\n3) William / Chloe spot checks…");
  const william = vms.find((v) => v.vm.name === "William Anderson")?.vm;
  const chloe = vms.find((v) => v.vm.name === "Chloe Ramirez")?.vm;
  if (!william) fail("William missing");
  if (!chloe) fail("Chloe missing");

  if (william.activitySummary.urgency !== "red") fail("William not red");
  if (william.activitySummary.moreCount < 1) fail("William missing +X");
  if (william.quickActions.find((a) => a.kind === "call")?.urgency !== "red") {
    fail("William call icon should be red");
  }
  if (chloe.activitySummary.primary?.isMissed !== true) {
    fail("Chloe primary should be missed call");
  }

  // Owner avatar on toggle
  const williamOn = buildLeadCardViewModelFromCard(
    listLeadColumns()
      .flatMap((c) => c.cards.map((card) => ({ card, status: c.leadStatus })))
      .find((x) => x.card.name === "William Anderson")!.card,
    "Contacted",
    { now, showOwnerAvatar: true },
  );
  if (!williamOn.showOwnerAvatar || !williamOn.owner.initials) {
    fail("owner avatar toggle failed");
  }
  console.log("   Owner toggle OK:", williamOn.owner);

  console.log("\n4) Index ≡ view-model ranking…");
  for (const { vm } of vms) {
    const summary = pickActivitySummary(
      listLeadActivityCandidates(vm.name, now),
      now,
    );
    const a = vm.activitySummary.primary?.id ?? null;
    const b = summary.primary?.id ?? null;
    if (a !== b) fail(`ranking drift for ${vm.name}: vm=${a} index=${b}`);
  }
  console.log("   OK — no drift");

  console.log("\nSMOKE OK — Session 2 ready for Session 3");
}

runAsCli(runSmokeSession2);
