/**
 * Session 9 / Phase 9 smoke: acceptance contracts + docs + CI readiness.
 * Run: npx tsx src/lib/leads/smoke-session9.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  assertUrgencyContrastAa,
  LEAD_CARD_A11Y_CHECKLIST,
} from "@/lib/leads/a11y-urgency";
import { assertHydrateKeysOwned } from "@/lib/leads/hydrate-keys";
import {
  getPhase9Manifest,
  LEAD_CARD_HYDRATE_KEYS,
  LEAD_CARD_PRODUCT_WALK,
  PHASE_9_EXIT_CRITERIA,
  PHASE_9_OUT_OF_SCOPE,
} from "@/lib/leads/phase-9";
import {
  DEFAULT_LEAD_CARD_SETTINGS,
} from "@/lib/leads/lead-card-settings";
import {
  ESCALATION_ENABLED,
  OWNER_AVATAR_DEFAULT,
  PUSH_NOTIFICATIONS_FOR_CARD,
  UNREPLIED_THRESHOLD_HOURS_DEFAULT,
} from "@/lib/leads/product-decisions";
import {
  enableSessionPersistence,
  getPersistenceMode,
} from "@/lib/persistence";
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

export function runSmokeSession9() {
  installSmokePolyfill();
  enableSessionPersistence();

  console.log("Phase 9 / Session 9 smoke…");

  console.log("\n1) Manifest…");
  const m = getPhase9Manifest();
  if (m.id !== "lead-card-phase-9") fail("bad phase id");
  if (m.status !== "ready_for_acceptance") fail("bad phase status");
  if (m.a11yChecklist.length !== LEAD_CARD_A11Y_CHECKLIST.length) {
    fail("a11y checklist drift");
  }
  if (m.productWalk.length !== LEAD_CARD_PRODUCT_WALK.length) {
    fail("product walk drift");
  }
  if (PHASE_9_EXIT_CRITERIA.length < 5) fail("exit criteria incomplete");
  if (PHASE_9_OUT_OF_SCOPE.length < 3) fail("out-of-scope incomplete");
  console.log("   OK —", m.title, "· next:", m.nextPhase.id);

  console.log("\n2) Locked decisions still hold…");
  if (UNREPLIED_THRESHOLD_HOURS_DEFAULT !== 24) fail("threshold");
  if (OWNER_AVATAR_DEFAULT !== false) fail("owner default");
  if (ESCALATION_ENABLED || PUSH_NOTIFICATIONS_FOR_CARD) {
    fail("escalation/push must stay off in Phase 9");
  }
  if (DEFAULT_LEAD_CARD_SETTINGS.showOwnerAvatar !== false) {
    fail("settings owner default");
  }
  if (DEFAULT_LEAD_CARD_SETTINGS.unrepliedThresholdHours !== 24) {
    fail("settings threshold default");
  }
  console.log("   OK");

  console.log("\n3) Contrast + a11y checklist…");
  assertUrgencyContrastAa();
  if (LEAD_CARD_A11Y_CHECKLIST.length < 10) fail("a11y checklist short");
  if (LEAD_CARD_PRODUCT_WALK.length < 10) fail("product walk short");
  console.log(
    "   OK — a11y",
    LEAD_CARD_A11Y_CHECKLIST.length,
    "· walk",
    LEAD_CARD_PRODUCT_WALK.length,
  );

  console.log("\n4) Docs present…");
  assertDoc(m.docs.acceptance, [
    "Phase 9",
    "Exit criteria",
    "Manual a11y",
    "Product walk",
    "Sign-off",
  ]);
  assertDoc(m.docs.apiRunbook, [
    "enableApiPersistence",
    "sales:leads:board:v6",
    "activities:attachments:list:v1",
    "X-Tenant-Id",
    "Phase 10",
  ]);
  for (const key of LEAD_CARD_HYDRATE_KEYS) {
    assertDoc(m.docs.apiRunbook, [key]);
  }
  for (const item of LEAD_CARD_A11Y_CHECKLIST) {
    assertDoc(m.docs.acceptance, [item]);
  }
  for (const step of LEAD_CARD_PRODUCT_WALK) {
    assertDoc(m.docs.acceptance, [step]);
  }
  assertDoc("docs/lead-card/README.md", [
    "phase-9-acceptance.md",
    "api-adapter-runbook.md",
    "smoke:phase9",
  ]);
  console.log("   OK —", m.docs.acceptance, "·", m.docs.apiRunbook);

  console.log("\n5) Hydrate keys ↔ store owners…");
  try {
    assertHydrateKeysOwned((rel) =>
      readFileSync(path.join(repoRoot(), rel), "utf8"),
    );
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }
  console.log("   OK —", LEAD_CARD_HYDRATE_KEYS.length, "keys owned");

  console.log("\n6) CI + persistence readiness…");
  const ci = path.join(repoRoot(), ".github/workflows/ci.yml");
  if (!existsSync(ci)) fail("CI workflow missing");
  const ciBody = readFileSync(ci, "utf8");
  if (!ciBody.includes("npm test") || !ciBody.includes("tsc --noEmit")) {
    fail("CI must run typecheck + tests");
  }
  if (getPersistenceMode() !== "session") fail("expected session mode");
  if (!ciBody.includes("src/lib/leads") || !ciBody.includes("eslint")) {
    fail("CI must lint Lead Card surface");
  }
  if (!LEAD_CARD_HYDRATE_KEYS.includes("sales:leads:activity-extras:v1")) {
    fail("hydrate keys missing activity-extras");
  }
  const listView = path.join(
    repoRoot(),
    "src/components/sales/leads/LeadListView.tsx",
  );
  if (!existsSync(listView)) fail("LeadListView missing");
  const listSrc = readFileSync(listView, "utf8");
  if (!listSrc.includes("URGENCY_WORDS") || !listSrc.includes("QUICK_STATE_WORDS")) {
    fail("LeadListView missing card-parity a11y labels");
  }
  const panelSrc = readFileSync(
    path.join(
      repoRoot(),
      "src/components/sales/leads/panels/LeadActivityListPanel.tsx",
    ),
    "utf8",
  );
  if (!panelSrc.includes("URGENCY_WORDS")) {
    fail("Activity panel must use shared URGENCY_WORDS");
  }
  const sidebar = readFileSync(
    path.join(repoRoot(), "src/components/layout/Sidebar.tsx"),
    "utf8",
  );
  if (!sidebar.includes("/activities/attachments")) {
    fail("Sidebar missing Attachments nav");
  }
  const focusHook = readFileSync(
    path.join(repoRoot(), "src/hooks/useFocusHighlight.ts"),
    "utf8",
  );
  if (!focusHook.includes("data-attachment-id")) {
    fail("FocusHighlight missing data-attachment-id");
  }
  const wq = readFileSync(
    path.join(repoRoot(), "src/lib/work-queue/live.ts"),
    "utf8",
  );
  if (!wq.includes("/activities/notes") || !wq.includes("/activities/attachments")) {
    fail("Work Queue HREF missing notes/attachments");
  }
  console.log("   OK — session · CI · list a11y · panel · nav · focus · WQ");

  console.log("\nSMOKE OK — Session 9 (Phase 9 acceptance ready)");
}

runAsCli(runSmokeSession9);
