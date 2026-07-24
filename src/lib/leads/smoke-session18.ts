/**
 * Session 18 / Phase 18 smoke: Pipeline SLA Work Queue.
 * Run: npx tsx src/lib/leads/smoke-session18.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  getPhase18Manifest,
  PHASE_18_DELIVERED,
  PHASE_18_STAGING_CHECKLIST,
} from "@/lib/leads/phase-18";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";
import {
  listSlaAttentionLeads,
  SLA_ATTENTION_RANK,
} from "@/lib/pipeline-sla/work-queue";
import { CATEGORIES_DEFAULT } from "@/lib/work-queue/config";
import { listWorkqueueItemRows } from "@/lib/work-queue/live";

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

export function runSmokeSession18() {
  installSmokePolyfill();
  console.log("Phase 18 / Session 18 smoke…");

  const m = getPhase18Manifest();
  if (m.id !== "lead-card-phase-18") fail("bad phase id");
  if (m.status !== "sla_work_queue_shipped") fail("bad status");
  if (PHASE_18_DELIVERED.length < 4) fail("delivered short");
  if (PHASE_18_STAGING_CHECKLIST.length < 4) fail("checklist short");

  const now = new Date("2026-07-23T12:00:00");

  console.log("\n1) Attention index ranking…");
  const all = listSlaAttentionLeads({ now });
  if (all.length < 4) fail(`expected ≥4 attention leads, got ${all.length}`);

  const byName = Object.fromEntries(all.map((e) => [e.name, e]));
  if (!byName["Jennifer Adams"] || byName["Jennifer Adams"].badgeLabel !== "Overdue") {
    fail("Jennifer should be Overdue in SLA queue");
  }
  if (
    !byName["Arjun Mehta"] ||
    byName["Arjun Mehta"].badgeLabel !== "Milestone Overdue"
  ) {
    fail("Arjun should be Milestone Overdue in SLA queue");
  }
  if (
    !byName["Chloe Ramirez"] ||
    byName["Chloe Ramirez"].badgeLabel !== "Due Today"
  ) {
    fail("Chloe should be Due Today in SLA queue");
  }
  if (!byName["Jamie Cole"] || byName["Jamie Cole"].badgeLabel !== "At Risk") {
    fail("Jamie should be At Risk in SLA queue");
  }
  if (byName["William Anderson"]) {
    fail("William (On Track) must not appear in SLA attention");
  }

  for (let i = 1; i < all.length; i++) {
    const prev = all[i - 1]!;
    const cur = all[i]!;
    if (
      SLA_ATTENTION_RANK[prev.badgeLabel] > SLA_ATTENTION_RANK[cur.badgeLabel]
    ) {
      fail(
        `rank broken: ${prev.name} (${prev.badgeLabel}) before ${cur.name} (${cur.badgeLabel})`,
      );
    }
  }
  console.log(
    "   OK —",
    all.map((e) => `${e.name}:${e.badgeLabel}`).join(" · "),
  );

  console.log("\n2) Work Queue rows + deep-links…");
  const johnAttention = listWorkqueueItemRows(
    "sla-attention",
    "John Smith",
    "all",
    now,
  );
  if (!johnAttention.some((r) => r.subject === "Jennifer Adams")) {
    fail("John Smith tab missing Jennifer in sla-attention");
  }
  if (!johnAttention.some((r) => r.subject === "Jamie Cole")) {
    fail("John Smith tab missing Jamie in sla-attention");
  }
  if (johnAttention.some((r) => r.subject === "Arjun Mehta")) {
    fail("Arjun is Tejas-owned; must not appear under John Smith");
  }
  const jenniferRow = johnAttention.find((r) => r.subject === "Jennifer Adams")!;
  if (!jenniferRow.href.includes("focus=")) {
    fail("SLA row must deep-link with focus=");
  }
  if (!jenniferRow.href.includes("/sales/leads")) {
    fail("SLA row must link to /sales/leads");
  }
  if (jenniferRow.status !== "Overdue") {
    fail(`Jennifer row status expected Overdue, got ${jenniferRow.status}`);
  }

  const overdueOnly = listWorkqueueItemRows(
    "sla-overdue",
    "John Smith",
    "all",
    now,
  );
  if (!overdueOnly.every((r) => r.status === "Overdue")) {
    fail("sla-overdue must only list Overdue");
  }
  if (!overdueOnly.some((r) => r.subject === "Jennifer Adams")) {
    fail("sla-overdue missing Jennifer");
  }

  const arjunRows = listWorkqueueItemRows(
    "sla-milestone-overdue",
    "Tejas Gokhe",
    "all",
    now,
  );
  if (!arjunRows.some((r) => r.subject === "Arjun Mehta")) {
    fail("Tejas tab milestone-overdue missing Arjun");
  }

  console.log("\n3) Config category…");
  const slaCat = CATEGORIES_DEFAULT.find((c) => c.id === "pipeline-sla");
  if (!slaCat) fail("CATEGORIES_DEFAULT missing pipeline-sla");
  const ids = slaCat.items.map((i) => i.id);
  for (const id of [
    "sla-attention",
    "sla-overdue",
    "sla-milestone-overdue",
    "sla-due-today",
    "sla-at-risk",
  ] as const) {
    if (!ids.includes(id)) fail(`missing sidebar item ${id}`);
  }

  console.log("\n4) Docs + UI wiring…");
  const wqBody = readFileSync(
    path.join(repoRoot(), "src/components/work-queue/WorkQueueView.tsx"),
    "utf8",
  );
  if (!wqBody.includes("onPipelineSlaChange")) {
    fail("WorkQueueView should refresh on pipeline SLA change");
  }
  const indexBody = readFileSync(
    path.join(repoRoot(), "src/lib/pipeline-sla/work-queue.ts"),
    "utf8",
  );
  if (!indexBody.includes("listSlaAttentionLeads")) {
    fail("missing listSlaAttentionLeads");
  }
  assertDoc("docs/lead-card/phase-18-sla-work-queue.md", [
    "Pipeline SLA",
    "Needs attention",
    "focus",
    "Milestone Overdue",
  ]);
  assertDoc("docs/lead-card/README.md", ["phase-18-sla-work-queue"]);

  console.log("\n✅ Session 18 smoke passed");
}

runAsCli(runSmokeSession18);
