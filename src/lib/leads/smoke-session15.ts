/**
 * Session 15 / Phase 15 smoke: upload + send gateways.
 * Run: npx tsx src/lib/leads/smoke-session15.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  createMockUploadFetch,
  enableApiUpload,
  enableLocalUpload,
  getUploadAdapter,
} from "@/lib/attachments/upload";
import { getAttachment, listAttachments } from "@/lib/attachments/store";
import {
  createMockSendFetch,
  enableApiSendGateway,
  enableDeviceIntentGateway,
  getSendGateway,
} from "@/lib/comms/send-gateway";
import { enableProductionComms } from "@/lib/comms/production";
import { submitLeadQuickAction } from "@/lib/leads/panel-actions";
import {
  getPhase15Manifest,
  PHASE_15_DELIVERED,
  PHASE_15_STAGING_CHECKLIST,
} from "@/lib/leads/phase-15";
import { setTenantContext } from "@/lib/persistence";
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

export async function runSmokeSession15() {
  installSmokePolyfill();
  enableLocalUpload();
  enableDeviceIntentGateway();
  setTenantContext({ tenantId: "tenant-s15" });

  console.log("Phase 15 / Session 15 smoke…");

  const m = getPhase15Manifest();
  if (m.id !== "lead-card-phase-15") fail("bad phase id");
  if (m.status !== "comms_files_scaffolded") fail("bad status");
  if (PHASE_15_DELIVERED.length < 5) fail("delivered short");
  if (PHASE_15_STAGING_CHECKLIST.length < 4) fail("checklist short");

  console.log("\n1) Local upload + attachment submit…");
  if (getUploadAdapter().mode !== "local") fail("expected local upload");
  const local = await submitLeadQuickAction(
    "attachment",
    "William Anderson",
    {
      title: "phase15-proof.pdf",
      body: "smoke bytes",
      date: "2026-07-23",
      time: "12:00",
      priority: "Medium",
      assignedTo: "John Smith",
    },
  );
  if (!local.ok || !local.id) fail(`local upload submit failed: ${JSON.stringify(local)}`);
  const att = getAttachment(local.id);
  if (!att?.storageUrl?.startsWith("local://")) {
    fail(`expected local storageUrl, got ${att?.storageUrl}`);
  }
  console.log("   OK —", att.storageUrl);

  console.log("\n2) API upload mock…");
  const uploadFetch = createMockUploadFetch();
  enableApiUpload({
    baseUrl: "https://mock.crm.test",
    getAccessToken: async () => "tok",
    fetchImpl: uploadFetch,
  });
  const up = await getUploadAdapter().upload({
    fileName: "api-doc.pdf",
    data: "YmFzZTY0",
    contentType: "application/pdf",
  });
  if (!up.ok || !up.storageUrl.includes("cdn.mock.test")) {
    fail(`api upload failed: ${JSON.stringify(up)}`);
  }
  console.log("   OK —", up.storageUrl);

  console.log("\n3) API send gateway mock…");
  const sendLog: { path: string; body: unknown }[] = [];
  enableApiSendGateway({
    baseUrl: "https://mock.crm.test",
    getAccessToken: async () => "tok",
    fetchImpl: createMockSendFetch(sendLog),
  });
  const gw = getSendGateway();
  if (gw.mode !== "api") fail("expected api send mode");
  const call = await gw.placeCall({ phone: "+61400111001" });
  const sms = await gw.sendSms({ phone: "+61400111001", body: "hi" });
  const email = await gw.sendEmail({
    email: "william.a@example.com",
    subject: "Hi",
    body: "Body",
  });
  if (!call.ok || !sms.ok || !email.ok) fail("send gateway failed");
  if (sendLog.length !== 3) fail(`expected 3 sends, got ${sendLog.length}`);
  console.log("   OK —", sendLog.map((s) => s.path).join(", "));

  console.log("\n4) Production flip without URL → demo modes…");
  const demo = await enableProductionComms({ baseUrl: null });
  if (demo.uploadMode !== "local" || demo.sendMode !== "device") {
    fail(`expected local/device, got ${demo.uploadMode}/${demo.sendMode}`);
  }
  console.log("   OK");

  console.log("\n5) Docs + wiring…");
  assertDoc("docs/lead-card/phase-15-comms-files.md", [
    "Session 15",
    "enableProductionComms",
    "storageUrl",
    "/v1/attachments/upload",
  ]);
  assertDoc("docs/lead-card/README.md", ["phase-15", "Session 15"]);
  const dialog = readFileSync(
    path.join(
      repoRoot(),
      "src/components/sales/leads/panels/LeadQuickActionDialog.tsx",
    ),
    "utf8",
  );
  if (!dialog.includes("getSendGateway")) {
    fail("dialog must use getSendGateway");
  }
  const boot = readFileSync(
    path.join(repoRoot(), "src/components/persistence/PersistenceBootstrap.tsx"),
    "utf8",
  );
  if (!boot.includes("enableProductionComms")) {
    fail("PersistenceBootstrap must enable production comms");
  }
  if (listAttachments().length < 1) fail("attachments empty");
  console.log("   OK");

  console.log("\nSMOKE OK — Session 15 (comms + files scaffolded)");
}

runAsCli(async () => {
  await runSmokeSession15();
});
