/**
 * Session 11 / Phase 11 smoke: status + tags fields, document requested Last Activity.
 * Run: npx tsx src/lib/leads/smoke-session11.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { listLeadActivityCandidates } from "@/lib/leads/activity-index";
import { pickLastCompletedActivity } from "@/lib/leads/activity-summary";
import { buildLeadCardViewModelFromCard } from "@/lib/leads/card-view-model";
import {
  getPhase11Manifest,
  PHASE_11_DELIVERED,
} from "@/lib/leads/phase-11";
import {
  isLeadCardFieldKey,
  LEAD_CARD_FIELD_OPTIONS,
  listLeadCardFieldOptions,
} from "@/lib/leads/lead-card-settings";
import { listDocumentRequests } from "@/lib/documents/requests/types";
import { LEAD_COLUMNS } from "@/lib/leads/types";
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

function findCard(name: string) {
  for (const col of LEAD_COLUMNS) {
    const card = col.cards.find((c) => c.name === name);
    if (card) return { card, status: col.leadStatus };
  }
  fail(`seed card missing: ${name}`);
}

export function runSmokeSession11() {
  installSmokePolyfill();

  console.log("Phase 11 / Session 11 smoke…");

  const manifest = getPhase11Manifest();
  if (manifest.id !== "lead-card-phase-11") fail("bad phase id");
  if (manifest.status !== "spec_polish_complete") fail("bad status");
  if (PHASE_11_DELIVERED.length < 4) fail("delivered too short");

  console.log("\n1) Field options — status + tags…");
  const keys = LEAD_CARD_FIELD_OPTIONS.map((f) => f.key);
  if (!keys.includes("status")) fail("status missing from FIELD_OPTIONS");
  if (!keys.includes("tags")) fail("tags missing from FIELD_OPTIONS");
  if (!isLeadCardFieldKey("status") || !isLeadCardFieldKey("tags")) {
    fail("isLeadCardFieldKey rejects status/tags");
  }
  const picker = listLeadCardFieldOptions();
  if (!picker.some((o) => o.key === "status" && o.label.includes("Stage"))) {
    fail("picker missing Pipeline / Stage");
  }
  if (!picker.some((o) => o.key === "tags")) fail("picker missing Tags");
  console.log("   OK");

  console.log("\n2) View-model resolves status + tags…");
  const william = findCard("William Anderson");
  if (!william.card.tags?.includes("Refinance")) {
    fail("William seed missing Refinance tag");
  }
  const vm = buildLeadCardViewModelFromCard(william.card, william.status, {
    dynamicFieldKeys: ["status", "tags", "company"],
    showOwnerAvatar: false,
  });
  const byKey = Object.fromEntries(vm.dynamicFields.map((f) => [f.key, f.value]));
  if (byKey.status !== "In Conversation") {
    fail(`expected pipeline stage In Conversation, got ${byKey.status}`);
  }
  if (!byKey.tags?.includes("Refinance") || !byKey.tags.includes("Hot")) {
    fail(`expected tags Refinance, Hot — got ${byKey.tags}`);
  }
  if (byKey.company !== "Anderson Finance") fail("company field broken");
  console.log("   OK —", byKey);

  console.log("\n3) Document requests in activity index…");
  const leadDocs = listDocumentRequests().filter((r) =>
    (r.relatedTo ?? "").includes("William Anderson"),
  );
  if (leadDocs.length < 1) fail("no William document requests in seed");

  const candidates = listLeadActivityCandidates("William Anderson");
  const docs = candidates.filter((c) => c.kind === "document");
  if (docs.length < 1) fail("fromDocumentRequests produced nothing for William");
  if (docs.some((c) => c.bucket !== "completed")) {
    fail("document requests must be completed timeline events");
  }
  if (docs.some((c) => c.sourceModule !== "documents")) {
    fail("document sourceModule must be documents");
  }

  const labeled = pickLastCompletedActivity(docs);
  if (!labeled || labeled.label !== "Document requested") {
    fail(`expected label Document requested, got ${labeled?.label}`);
  }
  console.log("   OK —", labeled.label, docs[0]?.title);

  console.log("\n4) Docs…");
  assertDoc("docs/lead-card/phase-11-polish.md", [
    "Session 11",
    "Pipeline / Stage",
    "Document requested",
  ]);
  assertDoc("docs/lead-card/README.md", ["phase-11", "Session 11"]);
  console.log("   OK");

  console.log("\nSMOKE OK — Session 11 (spec polish)");
}

runAsCli(runSmokeSession11);
