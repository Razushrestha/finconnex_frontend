/**
 * Session 12 / Phase 12 smoke: status timeline + a11y surface + WQ documents.
 * Run: npx tsx src/lib/leads/smoke-session12.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  hrefForLeadActivity,
  listLeadActivityCandidates,
} from "@/lib/leads/activity-index";
import { pickLastCompletedActivity } from "@/lib/leads/activity-summary";
import { assertLeadCardA11ySurface } from "@/lib/leads/a11y-surface";
import {
  getPhase12Manifest,
  PHASE_12_DELIVERED,
  PHASE_12_PRODUCT_WALK,
} from "@/lib/leads/phase-12";
import { logStatusChange } from "@/lib/rules/audit";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

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

export function runSmokeSession12() {
  installSmokePolyfill();

  console.log("Phase 12 / Session 12 smoke…");

  const manifest = getPhase12Manifest();
  if (manifest.id !== "lead-card-phase-12") fail("bad phase id");
  if (manifest.status !== "timeline_complete") fail("bad status");
  if (PHASE_12_DELIVERED.length < 5) fail("delivered too short");
  if (PHASE_12_PRODUCT_WALK.length < 3) fail("walk too short");

  console.log("\n1) Seed status history on Katherina…");
  const kCandidates = listLeadActivityCandidates("Katherina Brooks");
  const kStatus = kCandidates.filter((c) => c.kind === "status_change");
  if (kStatus.length < 1) fail("expected seeded status_change for Katherina");
  const kLabeled = pickLastCompletedActivity(kStatus);
  if (kLabeled?.label !== "Status changed") {
    fail(`expected Status changed, got ${kLabeled?.label}`);
  }
  console.log("   OK —", kStatus[0]?.title);

  console.log("\n2) Live logStatusChange → index…");
  logStatusChange(
    "sales.leads",
    "John Smith",
    "l-n1",
    "William Anderson",
    "New",
    "Contacted",
  );
  const wStatus = listLeadActivityCandidates("William Anderson").filter(
    (c) => c.kind === "status_change",
  );
  if (wStatus.length < 1) fail("William missing status_change after log");
  const live = wStatus.find((c) => c.title.includes("New → Contacted"));
  if (!live) fail("live New → Contacted event not found");
  const href = hrefForLeadActivity(live);
  if (!href?.startsWith("/sales/leads?")) {
    fail(`expected leads deep-link, got ${href}`);
  }
  console.log("   OK —", href);

  console.log("\n3) Document deep-link…");
  const doc = listLeadActivityCandidates("William Anderson").find(
    (c) => c.kind === "document",
  );
  if (!doc) fail("William document request missing");
  const docHref = hrefForLeadActivity(doc);
  if (!docHref?.startsWith("/documents/requests?")) {
    fail(`expected documents deep-link, got ${docHref}`);
  }
  console.log("   OK —", docHref);

  console.log("\n4) A11y surface contracts…");
  try {
    assertLeadCardA11ySurface((rel) =>
      readFileSync(path.join(repoRoot(), rel), "utf8"),
    );
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }
  console.log("   OK — LeadCard + List + panels");

  console.log("\n5) Work Queue + Kanban emit + docs…");
  const wq = readFileSync(
    path.join(repoRoot(), "src/lib/work-queue/live.ts"),
    "utf8",
  );
  if (!wq.includes('documents: "/documents/requests"')) {
    fail("Work Queue missing documents HREF");
  }
  const kanban = readFileSync(
    path.join(repoRoot(), "src/components/sales/leads/LeadKanbanBoard.tsx"),
    "utf8",
  );
  if (!kanban.includes("emitLeadActivityChange")) {
    fail("Kanban must emit lead-activity after status change");
  }
  assertDoc("docs/lead-card/phase-12-timeline.md", [
    "Session 12",
    "Status changed",
    "a11y surface",
  ]);
  assertDoc("docs/lead-card/README.md", ["phase-12", "Session 12"]);
  for (const step of PHASE_12_PRODUCT_WALK) {
    assertDoc("docs/lead-card/phase-12-timeline.md", [step.slice(0, 24)]);
  }
  console.log("   OK");

  console.log("\nSMOKE OK — Session 12 (timeline + a11y surface)");
}

runAsCli(runSmokeSession12);
