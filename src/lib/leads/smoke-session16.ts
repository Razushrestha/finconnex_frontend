/**
 * Session 16 / Phase 16 smoke: Pipeline Stage + Milestone SLA.
 * Cross-checks mortgage PDF defaults + Day 1→16 timeline + card UI.
 * Run: npx tsx src/lib/leads/smoke-session16.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildLeadCardViewModelFromCard } from "@/lib/leads/card-view-model";
import {
  getPhase16Manifest,
  PHASE_16_DELIVERED,
  PHASE_16_STAGING_CHECKLIST,
} from "@/lib/leads/phase-16";
import { listLeadColumns } from "@/lib/leads/store";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";
import {
  bandForDue,
  computeLeadSla,
  formatRemainingDetail,
  leadStatusToPipelineStage,
} from "@/lib/pipeline-sla/engine";
import { DEFAULT_MORTGAGE_PIPELINE_SLA } from "@/lib/pipeline-sla/seed";
import {
  loadPipelineSlaConfig,
  savePipelineSlaConfig,
} from "@/lib/pipeline-sla/settings";

const fail: (msg: string) => never = smokeFail;

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function assertDoc(rel: string, needles: string[]) {
  const full = path.join(repoRoot(), rel);
  if (!existsSync(full)) fail(`missing doc ${rel}`);
  const body = readFileSync(full, "utf8");
  for (const n of needles) {
    if (!body.includes(n)) fail(`doc ${rel} missing "${n}"`);
  }
}

function findCard(name: string) {
  for (const col of listLeadColumns()) {
    const card = col.cards.find((c) => c.name === name);
    if (card) return { card, status: col.leadStatus };
  }
  return null;
}

/** PDF “How it works” timeline — lead created 1 July 10:00. */
function assertPdfTimeline() {
  const config = DEFAULT_MORTGAGE_PIPELINE_SLA;
  const started = new Date("2026-07-01T10:00:00");

  // Day 1 — New Lead, 15 mins into 30-min stage SLA → On Track (stage clock)
  // Appointment milestone is due tomorrow → At Risk on combined badge is OK;
  // PDF prose highlights the stage clock as On Track.
  const day1 = computeLeadSla({
    stage: "New Lead",
    stageEnteredAt: started,
    pipelineStartedAt: started,
    config,
    now: new Date("2026-07-01T10:15:00"),
  });
  if (day1.stageClock?.band !== "on_track") {
    fail(`PDF Day1 stage expected on_track, got ${day1.stageClock?.band}`);
  }
  if (!day1.stageClock?.detail.includes("mins left")) {
    fail(`PDF Day1 stage detail: ${day1.stageClock?.detail}`);
  }
  if (!["On Track", "At Risk"].includes(day1.badgeLabel)) {
    fail(`PDF Day1 badge unexpected: ${day1.badgeLabel}`);
  }

  // Day 5 — In Conversation; stage reset; docs/processing milestones still ahead
  const day5 = computeLeadSla({
    stage: "In Conversation",
    stageEnteredAt: new Date("2026-07-05T10:00:00"),
    pipelineStartedAt: started,
    config,
    now: new Date("2026-07-05T12:00:00"),
  });
  if (!["On Track", "At Risk"].includes(day5.badgeLabel)) {
    fail(`PDF Day5 unexpected badge: ${day5.badgeLabel}`);
  }

  // Day 10 — Waiting on Documents; Processing milestone due 11 Jul → At Risk / Due Tomorrow
  const day10 = computeLeadSla({
    stage: "Waiting on Documents",
    stageEnteredAt: new Date("2026-07-10T10:00:00"),
    pipelineStartedAt: started,
    config,
    now: new Date("2026-07-10T12:00:00"),
  });
  if (day10.badgeBand !== "at_risk" || day10.badgeLabel !== "At Risk") {
    fail(
      `PDF Day10 expected At Risk (due tomorrow), got ${day10.badgeLabel} (${day10.badgeBand})`,
    );
  }
  if (day10.milestoneClock?.targetStage !== "Processing") {
    fail(
      `PDF Day10 primary milestone should be Processing, got ${day10.milestoneClock?.targetStage}`,
    );
  }

  // Day 11 — milestone past due, stage still OK → Milestone Overdue
  const day11 = computeLeadSla({
    stage: "Waiting on Documents",
    stageEnteredAt: new Date("2026-07-10T10:00:00"),
    pipelineStartedAt: started,
    config,
    now: new Date("2026-07-11T12:00:00"),
  });
  if (day11.badgeLabel !== "Milestone Overdue") {
    fail(`PDF Day11 expected Milestone Overdue, got ${day11.badgeLabel}`);
  }

  // Day 16 — still milestone overdue (PDF “OVERDUE 6 Days” style)
  const day16 = computeLeadSla({
    stage: "Waiting on Documents",
    stageEnteredAt: new Date("2026-07-10T10:00:00"),
    pipelineStartedAt: started,
    config,
    now: new Date("2026-07-16T12:00:00"),
  });
  if (day16.badgeLabel !== "Milestone Overdue") {
    fail(`PDF Day16 expected Milestone Overdue, got ${day16.badgeLabel}`);
  }
  if (!day16.milestoneClock?.detail.includes("overdue")) {
    fail(`PDF Day16 detail expected overdue…, got ${day16.milestoneClock?.detail}`);
  }

  // Sarah-style card: stage OK + milestone overdue → badge Milestone Overdue
  const sarah = computeLeadSla({
    stage: "In Conversation",
    stageEnteredAt: new Date("2026-07-18T09:00:00"),
    pipelineStartedAt: new Date("2026-07-01T10:00:00"),
    config,
    now: new Date("2026-07-16T12:00:00"),
  });
  if (sarah.badgeLabel !== "Milestone Overdue") {
    fail(`PDF Sarah-style expected Milestone Overdue, got ${sarah.badgeLabel}`);
  }
  if (sarah.stageClock?.band !== "on_track") {
    fail(`PDF Sarah-style stage should be on_track, got ${sarah.stageClock?.band}`);
  }
  if (sarah.milestoneClock?.band !== "overdue") {
    fail(`PDF Sarah-style milestone should be overdue`);
  }
  // Engine surfaces worst/soonest incomplete milestone (Processing 10d before Docs 12d).
  if (!sarah.milestoneClock?.durationLabel?.endsWith("Days")) {
    fail(
      `PDF milestone missing duration label, got ${sarah.milestoneClock?.durationLabel}`,
    );
  }
  if (sarah.milestoneClock.targetStage !== "Processing") {
    fail(
      `PDF Sarah-style primary milestone expected Processing, got ${sarah.milestoneClock.targetStage}`,
    );
  }
}

function assertPdfSeedDefaults() {
  const cfg = DEFAULT_MORTGAGE_PIPELINE_SLA;
  const byStage = Object.fromEntries(
    cfg.stageSlas.map((r) => [r.stage, r.duration]),
  );
  if (byStage["New Lead"]?.amount !== 30 || byStage["New Lead"]?.unit !== "minutes") {
    fail("PDF seed: New Lead 30 minutes");
  }
  if (byStage["Appointment Booked"]?.amount !== 2) fail("PDF seed: Appt 2 days");
  if (byStage["In Conversation"]?.amount !== 7) fail("PDF seed: Convo 7 days");
  if (byStage["Waiting on Documents"]?.amount !== 14) {
    fail("PDF seed: Waiting on Documents 14 days");
  }
  if (byStage["Documents Received"]?.amount !== 2) fail("PDF seed: Docs Received 2");
  if (byStage["Processing"]?.amount !== 21) fail("PDF seed: Processing 21 days");
  if (byStage["Settled"] !== null) fail("PDF seed: Settled no stage SLA");
  if (byStage["Lost"] !== null) fail("PDF seed: Lost no stage SLA");

  const ms = Object.fromEntries(
    cfg.milestones.map((m) => [m.targetStage, m.duration.amount]),
  );
  if (ms["Appointment Booked"] !== 1) fail("PDF milestone Appt 1 day");
  if (ms["In Conversation"] !== 5) fail("PDF milestone Convo 5 days");
  if (ms["Waiting on Documents"] !== 12) fail("PDF milestone Docs 12 days");
  if (ms["Processing"] !== 10) fail("PDF milestone Processing 10 days");
  if (ms["Settled"] !== 60) fail("PDF milestone Settled 60 days");
}

export function runSmokeSession16() {
  installSmokePolyfill();

  console.log("Phase 16 / Session 16 smoke…");

  const m = getPhase16Manifest();
  if (m.id !== "lead-card-phase-16") fail("bad phase id");
  if (m.status !== "pipeline_sla_shipped") fail("bad status");
  if (PHASE_16_DELIVERED.length < 6) fail("delivered short");
  if (PHASE_16_STAGING_CHECKLIST.length < 4) fail("checklist short");

  console.log("\n1) PDF seed defaults…");
  assertPdfSeedDefaults();

  console.log("\n2) Engine bands + status bridge…");
  const now = new Date("2026-07-23T12:00:00");
  if (leadStatusToPipelineStage("New") !== "New Lead") fail("New map");
  if (leadStatusToPipelineStage("Contacted") !== "In Conversation") {
    fail("Contacted map");
  }
  if (leadStatusToPipelineStage("Qualified") !== "Waiting on Documents") {
    fail("Qualified map");
  }
  if (leadStatusToPipelineStage("Unqualified") !== "Lost") fail("Lost map");
  if (leadStatusToPipelineStage("Converted") !== "Settled") fail("Settled map");

  const dueSoon = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  if (bandForDue(dueSoon, now, { amount: 1, unit: "days" }) !== "due_today") {
    fail("due_today band (same calendar day)");
  }
  if (
    bandForDue(new Date("2026-07-24T12:00:00"), now, {
      amount: 2,
      unit: "days",
    }) !== "at_risk"
  ) {
    fail("at_risk band (due tomorrow)");
  }
  if (
    bandForDue(dueSoon, now, { amount: 30, unit: "minutes" }) !== "on_track"
  ) {
    fail("sub-day SLA should stay on_track until overdue");
  }
  if (!formatRemainingDetail(dueSoon, now).includes("left")) {
    fail("remaining detail");
  }

  const lost = computeLeadSla({
    stage: "Lost",
    stageEnteredAt: now,
    pipelineStartedAt: now,
    config: DEFAULT_MORTGAGE_PIPELINE_SLA,
    now,
  });
  if (lost.badgeLabel !== "No SLA") fail("Lost should have No SLA");

  console.log("\n3) PDF Day 1→16 timeline…");
  assertPdfTimeline();

  console.log("\n4) Settings round-trip…");
  const cfg = loadPipelineSlaConfig();
  if (cfg.pipelineId !== "mortgage") fail("default pipeline id");
  if (cfg.stageSlas.length < 8) fail("stage rows missing");
  if (cfg.milestones.length < 3) fail("milestones missing");
  const saved = savePipelineSlaConfig({
    ...cfg,
    pipelineName: "Mortgage Pipeline (smoke)",
  });
  if (saved.pipelineName !== "Mortgage Pipeline (smoke)") fail("save name");
  savePipelineSlaConfig(DEFAULT_MORTGAGE_PIPELINE_SLA);

  console.log("\n5) Seeded Lead Card SLA bands (fixed now)…");
  const william = findCard("William Anderson");
  if (!william) fail("William missing");
  const wVm = buildLeadCardViewModelFromCard(william.card, william.status, {
    now,
  });
  if (!wVm.sla || wVm.sla.badgeLabel !== "On Track") {
    fail(`William expected On Track, got ${wVm.sla?.badgeLabel}`);
  }
  if (wVm.activitySummary.urgency == null) {
    fail("William Activity Summary must still exist alongside SLA");
  }

  const chloe = findCard("Chloe Ramirez");
  if (!chloe) fail("Chloe missing");
  const cVm = buildLeadCardViewModelFromCard(chloe.card, chloe.status, {
    now,
  });
  if (!cVm.sla || cVm.sla.badgeBand !== "due_today") {
    fail(
      `Chloe expected due_today, got ${cVm.sla?.badgeBand} / ${cVm.sla?.badgeLabel}`,
    );
  }

  const jennifer = findCard("Jennifer Adams");
  if (!jennifer) fail("Jennifer missing");
  const jVm = buildLeadCardViewModelFromCard(jennifer.card, jennifer.status, {
    now,
  });
  if (
    !jVm.sla ||
    jVm.sla.badgeBand !== "overdue" ||
    jVm.sla.badgeLabel !== "Overdue"
  ) {
    fail(
      `Jennifer expected Overdue stage, got ${jVm.sla?.badgeLabel} (${jVm.sla?.badgeBand})`,
    );
  }

  const arjun = findCard("Arjun Mehta");
  if (!arjun) fail("Arjun missing");
  const aVm = buildLeadCardViewModelFromCard(arjun.card, arjun.status, {
    now,
  });
  if (!aVm.sla || aVm.sla.badgeLabel !== "Milestone Overdue") {
    fail(`Arjun expected Milestone Overdue, got ${aVm.sla?.badgeLabel}`);
  }

  console.log("\n6) UI + docs needles (PDF card layout)…");
  for (const rel of [
    "src/components/sales/leads/LeadSlaChip.tsx",
    "src/components/settings/PipelineSlaSettingsClient.tsx",
    "src/components/sales/leads/LeadCard.tsx",
    "src/components/sales/leads/LeadListView.tsx",
  ] as const) {
    const full = path.join(repoRoot(), rel);
    if (!existsSync(full)) fail(`missing ${rel}`);
  }
  const cardBody = readFileSync(
    path.join(repoRoot(), "src/components/sales/leads/LeadCard.tsx"),
    "utf8",
  );
  if (!cardBody.includes('variant="badge"')) {
    fail("LeadCard missing top-right SLA badge");
  }
  if (!cardBody.includes('variant="panel"')) {
    fail("LeadCard missing Stage/Milestone SLA panel");
  }
  if (!cardBody.includes("Activity Summary")) {
    fail("LeadCard must keep Activity Summary");
  }

  const chipBody = readFileSync(
    path.join(repoRoot(), "src/components/sales/leads/LeadSlaChip.tsx"),
    "utf8",
  );
  for (const needle of [
    "Stage Due",
    "Milestone:",
    "Clock",
    "Crosshair",
    "SLA_CLOCK_TEXT",
    "durationLabel",
  ] as const) {
    if (!chipBody.includes(needle)) fail(`LeadSlaChip missing ${needle}`);
  }

  const settingsBody = readFileSync(
    path.join(
      repoRoot(),
      "src/components/settings/PipelineSlaSettingsClient.tsx",
    ),
    "utf8",
  );
  for (const needle of [
    "Stage SLAs",
    "Milestone SLAs",
    "Add milestone",
  ] as const) {
    if (!settingsBody.includes(needle)) {
      fail(`Pipeline settings missing "${needle}"`);
    }
  }

  assertDoc("docs/lead-card/phase-16-pipeline-sla.md", [
    "Stage SLA",
    "Milestone SLA",
    "Activity Summary",
  ]);
  assertDoc("docs/lead-card/README.md", ["phase-16-pipeline-sla"]);

  console.log("\n✅ Session 16 smoke passed (PDF cross-check OK)");
}

runAsCli(runSmokeSession16);
