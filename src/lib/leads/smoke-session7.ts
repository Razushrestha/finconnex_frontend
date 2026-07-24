/**
 * P1 smoke: contact intents, attachments, custom fields on card, list VM parity.
 * Run: npx tsx src/lib/leads/smoke-session7.ts
 */

import assert from "node:assert/strict";
import {
  normalizePhoneForTel,
  openCallIntent,
  openEmailIntent,
  openSmsIntent,
} from "@/lib/leads/contact-intents";
import { createAttachment, listAttachments } from "@/lib/attachments/store";
import { listLeadActivityCandidates } from "@/lib/leads/activity-index";
import { buildLeadCardViewModelFromCard } from "@/lib/leads/card-view-model";
import {
  DEFAULT_LEAD_CARD_SETTINGS,
  isLeadCardFieldKey,
  listLeadCardFieldOptions,
  saveLeadCardSettings,
  settingsValuesToLeadCard,
} from "@/lib/leads/lead-card-settings";
import { LEAD_COLUMNS } from "@/lib/leads/types";
import { listActiveCustomFieldsForEntity } from "@/lib/custom-fields/store";
import { leadCreateHref, submitLeadQuickAction } from "@/lib/leads/panel-actions";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";

const fail: (msg: string) => never = smokeFail;

export async function runSmokeSession7() {
  installSmokePolyfill();
  console.log("P1 / Session 7 smoke…");

  console.log("\n1) Contact intents…");
  assert.equal(normalizePhoneForTel("+61 400 111 001"), "+61400111001");
  const noPhone = openCallIntent(undefined);
  assert.equal(noPhone.ok, false);
  const noEmail = openEmailIntent("not-an-email");
  assert.equal(noEmail.ok, false);
  // In Node there is no window — intents still validate & return ok when data present
  assert.equal(openCallIntent("+61 400 111 001").ok, true);
  assert.equal(openSmsIntent("+61 400 111 001", "Hi").ok, true);
  assert.equal(openEmailIntent("a@b.com", { subject: "Hi" }).ok, true);
  console.log("   OK");

  console.log("\n2) Attachments module…");
  const before = listAttachments().length;
  const att = createAttachment({
    fileName: "p1-smoke.pdf",
    relatedTo: "Lead: William Anderson",
    uploadedBy: "John Smith",
  });
  assert.ok(att.id.startsWith("att-"));
  assert.equal(listAttachments().length, before + 1);
  const cands = listLeadActivityCandidates("William Anderson");
  const found = cands.find((c) => c.id === att.id && c.kind === "attachment");
  if (!found) fail("attachment not in activity index");
  assert.equal(found.sourceModule, "attachments");
  console.log("   OK —", att.fileName);

  console.log("\n3) Quick action attachment submit…");
  const logged = await submitLeadQuickAction(
    "attachment",
    "William Anderson",
    {
      title: "signed-mandate.pdf",
      body: "From smoke",
      date: "2026-07-23",
      time: "10:00",
      priority: "Medium",
      assignedTo: "John Smith",
    },
  );
  assert.equal(logged.ok, true);
  assert.ok(leadCreateHref("attachment", "William Anderson").includes("/activities/attachments"));
  console.log("   OK");

  console.log("\n4) Custom fields in Lead Card picker…");
  const leadCfs = listActiveCustomFieldsForEntity("Lead");
  assert.ok(leadCfs.length >= 1, "expected seed Lead custom fields");
  const options = listLeadCardFieldOptions();
  const customOpts = options.filter((o) => o.group === "custom");
  assert.ok(customOpts.length >= 1, "picker missing custom fields");
  assert.ok(isLeadCardFieldKey("cf:leadScore"));
  assert.ok(!isLeadCardFieldKey("cf:"));
  const parsed = settingsValuesToLeadCard({
    showOwnerAvatar: false,
    dynamicFields: "phone,cf:leadScore,company,email",
    unrepliedThresholdHours: 24,
  });
  assert.equal(parsed.dynamicFieldKeys.includes("cf:leadScore"), true);
  console.log(
    "   OK — custom options",
    customOpts.map((o) => o.key).join(","),
  );

  console.log("\n5) Card VM reads custom values…");
  const william = LEAD_COLUMNS.flatMap((c) =>
    c.cards.map((card) => ({ card, status: c.leadStatus })),
  ).find((x) => x.card.name === "William Anderson");
  if (!william) fail("William missing from seed");
  const vm = buildLeadCardViewModelFromCard(william.card, william.status, {
    cardSettings: {
      ...DEFAULT_LEAD_CARD_SETTINGS,
      dynamicFieldKeys: ["cf:leadScore", "cf:preferredBranch", "phone"],
    },
  });
  const keys = vm.dynamicFields.map((f) => f.key);
  if (!keys.includes("cf:leadScore")) fail("VM missing leadScore");
  const score = vm.dynamicFields.find((f) => f.key === "cf:leadScore");
  assert.equal(score?.value, "86");
  console.log("   OK —", vm.dynamicFields.map((f) => `${f.key}=${f.value}`).join(", "));

  // restore defaults
  saveLeadCardSettings(DEFAULT_LEAD_CARD_SETTINGS);

  console.log("\n6) List parity (same VM surface)…");
  assert.ok(vm.quickActions.length === 7);
  assert.ok(vm.activitySummary !== undefined);
  console.log("   OK — 7 quick actions + activity summary present");

  console.log("\nSMOKE OK — Session 7 (P1 polish)");
}

runAsCli(runSmokeSession7);
