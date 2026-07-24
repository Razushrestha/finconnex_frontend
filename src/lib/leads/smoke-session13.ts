/**
 * Session 13 / Phase 13 smoke: acceptance close-out pack readiness.
 * Does not mark human sign-off complete — only proves the pack + automated gates.
 * Run: npx tsx src/lib/leads/smoke-session13.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { LEAD_CARD_A11Y_CHECKLIST } from "@/lib/leads/a11y-urgency";
import { assertLeadCardA11ySurface } from "@/lib/leads/a11y-surface";
import { assertHydrateKeysOwned } from "@/lib/leads/hydrate-keys";
import { LEAD_CARD_PRODUCT_WALK } from "@/lib/leads/phase-9";
import {
  getPhase13Manifest,
  PHASE_13_AUTOMATED_GATES,
  PHASE_13_EXTENDED_WALK,
  PHASE_13_HUMAN_EXIT,
  PHASE_13_NEXT_AFTER_ACCEPT,
} from "@/lib/leads/phase-13";
import {
  ESCALATION_ENABLED,
  OWNER_AVATAR_DEFAULT,
  PUSH_NOTIFICATIONS_FOR_CARD,
  UNREPLIED_THRESHOLD_HOURS_DEFAULT,
} from "@/lib/leads/product-decisions";
import { enableSessionPersistence } from "@/lib/persistence";
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
  return body;
}

export function runSmokeSession13() {
  installSmokePolyfill();
  enableSessionPersistence();

  console.log("Phase 13 / Session 13 smoke…");

  const m = getPhase13Manifest();
  if (m.id !== "lead-card-phase-13") fail("bad phase id");
  if (m.status !== "awaiting_human_signoff") fail("bad status");
  if (PHASE_13_AUTOMATED_GATES.length < 4) fail("automated gates short");
  if (PHASE_13_HUMAN_EXIT.length < 5) fail("human exit short");
  if (PHASE_13_EXTENDED_WALK.length < 5) fail("extended walk short");
  if (PHASE_13_NEXT_AFTER_ACCEPT[0]?.id !== "lead-card-phase-14") {
    fail("next phase must be phase-14");
  }

  console.log("\n1) Manifest…");
  console.log("   OK —", m.title, "·", m.status);

  console.log("\n2) Locked decisions still hold…");
  if (UNREPLIED_THRESHOLD_HOURS_DEFAULT !== 24) fail("unreplied ≠ 24");
  if (OWNER_AVATAR_DEFAULT !== false) fail("avatar default");
  if (ESCALATION_ENABLED || PUSH_NOTIFICATIONS_FOR_CARD) {
    fail("escalation/push must stay off");
  }
  console.log("   OK");

  console.log("\n3) Close-out docs…");
  const closeout = assertDoc(m.docs.closeout, [
    "Phase 13",
    "Awaiting human sign-off",
    "Sign-off",
    "Phase 14",
    "Pipeline / Stage",
    "Status changed",
  ]);
  for (const step of PHASE_13_EXTENDED_WALK) {
    if (!closeout.includes(step.slice(0, 28))) {
      fail(`closeout missing walk: ${step.slice(0, 40)}`);
    }
  }
  assertDoc(m.docs.acceptance, [
    "Phase 9",
    "Sign-off",
    "Manual a11y",
    "Phase 13",
  ]);
  for (const item of LEAD_CARD_A11Y_CHECKLIST) {
    assertDoc(m.docs.acceptance, [item]);
  }
  for (const step of LEAD_CARD_PRODUCT_WALK) {
    assertDoc(m.docs.acceptance, [step]);
  }
  assertDoc("docs/lead-card/README.md", ["phase-13", "Session 13"]);
  console.log("   OK —", m.docs.closeout);

  console.log("\n4) Automated surface + hydrate…");
  try {
    assertLeadCardA11ySurface((rel) =>
      readFileSync(path.join(repoRoot(), rel), "utf8"),
    );
    assertHydrateKeysOwned((rel) =>
      readFileSync(path.join(repoRoot(), rel), "utf8"),
    );
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }
  const ci = path.join(repoRoot(), ".github/workflows/ci.yml");
  if (!existsSync(ci)) fail("CI missing");
  console.log("   OK — a11y surface · hydrate · CI");

  console.log("\n5) Human items remain open (expected)…");
  if (!closeout.includes("- [ ]")) {
    fail("closeout should keep open checkboxes for human walk");
  }
  if (!closeout.includes("| Product | | | |")) {
    fail("sign-off table placeholders must remain until humans fill them");
  }
  console.log("   OK — pack ready for humans; not auto-accepted");

  console.log("\nSMOKE OK — Session 13 (close-out pack ready · awaiting sign-off)");
}

runAsCli(runSmokeSession13);
