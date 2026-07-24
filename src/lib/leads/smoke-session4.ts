/**
 * Session 4 smoke: Lead Card settings + a11y/view-model contracts.
 * Run: npx tsx src/lib/leads/smoke-session4.ts
 */

import { assertActivitySummaryFixtures } from "@/lib/leads/activity-summary.fixtures";
import { buildLeadCardViewModelFromCard } from "@/lib/leads/card-view-model";
import {
  DEFAULT_LEAD_CARD_SETTINGS,
  MAX_DYNAMIC_FIELDS,
  leadCardSettingsToValues,
  loadLeadCardSettings,
  saveLeadCardSettings,
  settingsValuesToLeadCard,
  unrepliedThresholdMs,
} from "@/lib/leads/lead-card-settings";
import { findSettingsPage } from "@/lib/settings/settings-config";
import { getSettingsSchema } from "@/lib/settings/settings-schemas";
import { listLeadColumns } from "@/lib/leads/store";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const fail: (msg: string) => never = smokeFail;

export function runSmokeSession4() {
  installSmokePolyfill();

  console.log("1) Ranking fixtures…");
  assertActivitySummaryFixtures();
  console.log("   OK");

  console.log("\n2) Settings registry…");
  const page = findSettingsPage("crm-configuration", "lead-card");
  if (!page) fail("Lead Card settings page missing from config");
  const schema = getSettingsSchema("crm-configuration", "lead-card");
  if (schema.title !== "Lead Card") fail("schema title mismatch");
  if (!schema.fields.some((f) => f.id === "showOwnerAvatar")) {
    fail("schema missing showOwnerAvatar");
  }
  console.log("   OK —", page.item.title, "·", page.item.moduleHref);

  console.log("\n3) Defaults…");
  const defaults = loadLeadCardSettings();
  if (defaults.showOwnerAvatar !== false) fail("owner avatar default must be off");
  if (defaults.dynamicFieldKeys.length > MAX_DYNAMIC_FIELDS) {
    fail("default fields exceed max");
  }
  if (defaults.unrepliedThresholdHours !== 24) fail("default threshold not 24h");
  if (unrepliedThresholdMs(defaults) !== 24 * 60 * 60 * 1000) {
    fail("threshold ms mismatch");
  }
  console.log("   OK —", defaults);

  console.log("\n4) Cap + round-trip…");
  const over = settingsValuesToLeadCard({
    showOwnerAvatar: true,
    dynamicFields: "company,email,phone,source,industry,jobTitle",
    unrepliedThresholdHours: 48,
  });
  if (over.dynamicFieldKeys.length !== MAX_DYNAMIC_FIELDS) {
    fail(`expected cap ${MAX_DYNAMIC_FIELDS}, got ${over.dynamicFieldKeys.length}`);
  }
  if (!over.showOwnerAvatar) fail("showOwnerAvatar not parsed");
  if (over.unrepliedThresholdHours !== 48) fail("threshold not parsed");

  const saved = saveLeadCardSettings({
    showOwnerAvatar: true,
    dynamicFieldKeys: ["phone", "source", "estimatedValue", "company", "email"],
    unrepliedThresholdHours: 12,
  });
  if (saved.dynamicFieldKeys.length !== 4) fail("save did not cap fields");
  if (saved.dynamicFieldKeys.includes("email")) {
    fail("5th field should have been dropped");
  }
  const reloaded = loadLeadCardSettings();
  if (reloaded.showOwnerAvatar !== true) fail("reload owner avatar");
  if (reloaded.unrepliedThresholdHours !== 12) fail("reload threshold");
  if (reloaded.dynamicFieldKeys.join(",") !== saved.dynamicFieldKeys.join(",")) {
    fail("reload fields mismatch");
  }
  console.log("   OK — saved", reloaded);

  // restore defaults for other smokes in same process
  saveLeadCardSettings(DEFAULT_LEAD_CARD_SETTINGS);

  console.log("\n5) View-model respects settings…");
  const william = listLeadColumns()
    .flatMap((c) => c.cards.map((card) => ({ card, status: c.leadStatus })))
    .find((x) => x.card.name === "William Anderson");
  if (!william) fail("William missing");

  const off = buildLeadCardViewModelFromCard(william.card, william.status, {
    cardSettings: DEFAULT_LEAD_CARD_SETTINGS,
  });
  if (off.showOwnerAvatar) fail("VM should hide owner by default settings");
  if (off.dynamicFields.length !== 3) fail("default fields should be 3");

  const on = buildLeadCardViewModelFromCard(william.card, william.status, {
    cardSettings: {
      showOwnerAvatar: true,
      dynamicFieldKeys: ["phone", "source"],
      unrepliedThresholdHours: 24,
    },
  });
  if (!on.showOwnerAvatar) fail("VM should show owner when enabled");
  if (on.dynamicFields.map((f) => f.key).join(",") !== "phone,source") {
    fail("VM field keys mismatch");
  }
  if (on.owner.initials !== "JS") fail("owner initials");
  console.log("   OK — fields", on.dynamicFields.map((f) => f.key));

  console.log("\n6) Values codec…");
  const values = leadCardSettingsToValues(DEFAULT_LEAD_CARD_SETTINGS);
  const back = settingsValuesToLeadCard(values);
  if (back.showOwnerAvatar !== false) fail("codec owner");
  if (back.dynamicFieldKeys.join(",") !== "company,email,phone") {
    fail("codec fields");
  }
  console.log("   OK");

  console.log("\nSMOKE OK — Session 4 (settings + a11y contracts) ready");
}

runAsCli(runSmokeSession4);
