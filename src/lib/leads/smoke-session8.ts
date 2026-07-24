/**
 * Session 8 / P2 smoke: product decisions, WCAG contrast, persistence adapter.
 * Run: npx tsx src/lib/leads/smoke-session8.ts
 */

import {
  assertUrgencyContrastAa,
  checkUrgencyContrast,
  LEAD_CARD_A11Y_CHECKLIST,
} from "@/lib/leads/a11y-urgency";
import {
  DEFAULT_LEAD_CARD_SETTINGS,
  loadLeadCardSettings,
} from "@/lib/leads/lead-card-settings";
import {
  ESCALATION_ENABLED,
  FOREVER_NEUTRAL_QUICK_ACTIONS,
  LEAD_CARD_PRODUCT_DECISIONS,
  OWNER_AVATAR_DEFAULT,
  PUSH_NOTIFICATIONS_FOR_CARD,
  UNREPLIED_THRESHOLD_HOURS_DEFAULT,
} from "@/lib/leads/product-decisions";
import {
  getPersistenceMode,
  getTenantContext,
  readPersistedJson,
  tenantScopedKey,
  enableSessionPersistence,
  writePersistedJson,
} from "@/lib/persistence";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const fail: (msg: string) => never = smokeFail;

export function runSmokeSession8() {
  installSmokePolyfill();
  enableSessionPersistence();

  console.log("P2 / Session 8 smoke…");

  console.log("\n1) Locked product decisions…");
  if (UNREPLIED_THRESHOLD_HOURS_DEFAULT !== 24) {
    fail("unreplied default must be 24h");
  }
  if (OWNER_AVATAR_DEFAULT !== false) fail("owner avatar default must be off");
  if (ESCALATION_ENABLED !== false) fail("escalation must be off for v1");
  if (PUSH_NOTIFICATIONS_FOR_CARD !== false) {
    fail("card push must be off for v1");
  }
  if (FOREVER_NEUTRAL_QUICK_ACTIONS.join(",") !== "note,attachment") {
    fail("forever-neutral set drift");
  }
  if (DEFAULT_LEAD_CARD_SETTINGS.unrepliedThresholdHours !== 24) {
    fail("settings default threshold not wired to decisions");
  }
  if (DEFAULT_LEAD_CARD_SETTINGS.showOwnerAvatar !== false) {
    fail("settings owner default not wired to decisions");
  }
  const loaded = loadLeadCardSettings();
  if (loaded.unrepliedThresholdHours < 1) fail("loaded threshold invalid");
  console.log("   OK —", LEAD_CARD_PRODUCT_DECISIONS);

  console.log("\n2) WCAG AA urgency contrast…");
  assertUrgencyContrastAa();
  const pairs = checkUrgencyContrast();
  console.log(
    "   OK —",
    pairs.map((p) => `${p.id}=${p.ratio.toFixed(2)}`).join(", "),
  );

  console.log("\n3) Manual a11y checklist present…");
  if (LEAD_CARD_A11Y_CHECKLIST.length < 8) {
    fail("a11y checklist too short");
  }
  console.log("   OK —", LEAD_CARD_A11Y_CHECKLIST.length, "items");

  console.log("\n4) Persistence adapter (session + tenant)…");
  if (getPersistenceMode() !== "session") fail("expected session mode");
  if (getTenantContext().tenantId !== "demo") {
    fail(`expected demo tenant, got ${getTenantContext().tenantId}`);
  }
  const key = "p2:smoke:probe";
  writePersistedJson(key, { ok: true });
  const scoped = tenantScopedKey(key);
  if (!scoped.startsWith("fc:demo:")) fail(`bad scoped key ${scoped}`);
  const round = readPersistedJson<{ ok: boolean } | null>(key, null);
  if (!round?.ok) fail("persistence round-trip failed");
  console.log("   OK —", scoped);

  console.log("\nSMOKE OK — Session 8 (P2 hardening)");
}

runAsCli(runSmokeSession8);
