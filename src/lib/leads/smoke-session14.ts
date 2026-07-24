/**
 * Session 14 / Phase 14 smoke: auth cutover + module REST hydrate.
 * Run: npx tsx src/lib/leads/smoke-session14.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { LEAD_CARD_HYDRATE_KEYS } from "@/lib/leads/phase-9";
import {
  getPhase14Manifest,
  PHASE_14_DELIVERED,
  PHASE_14_STAGING_CHECKLIST,
} from "@/lib/leads/phase-14";
import {
  createMockModuleApi,
  getPersistenceMode,
  readPersistedJson,
  runLiveApiCutover,
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

export async function runSmokeSession14() {
  installSmokePolyfill();

  console.log("Phase 14 / Session 14 smoke…");

  const m = getPhase14Manifest();
  if (m.id !== "lead-card-phase-14") fail("bad phase id");
  if (m.status !== "cutover_scaffolded") fail("bad status");
  if (PHASE_14_DELIVERED.length < 5) fail("delivered short");
  if (PHASE_14_STAGING_CHECKLIST.length < 4) fail("staging checklist short");
  if (m.nextPhase.id !== "lead-card-phase-15") fail("next must be phase-15");

  console.log("\n1) Module cutover with mock API…");
  const mock = createMockModuleApi();
  const tenantId = "tenant_finconnex";
  const probeKey = "sales:leads:board:v6";
  mock.seedModule(probeKey, { columns: [{ id: "new", title: "New" }] }, tenantId);
  mock.seedModule(
    "settings:values:v1",
    { "crm-configuration/lead-card": { showOwnerAvatar: false } },
    tenantId,
  );

  const result = await runLiveApiCutover({
    baseUrl: "https://mock.crm.test",
    fetchImpl: mock.fetchImpl,
    useModuleRoutes: true,
    hydrateKeys: [probeKey, "settings:values:v1"],
    bridge: {
      authenticated: true,
      tenantId,
      tenantSlug: "finconnex",
      accessToken: "smoke-jwt",
    },
  });

  if (result.mode !== "api") fail(`expected api, got ${result.mode}`);
  if (result.transport !== "module") fail(`expected module transport`);
  if (result.moduleHydrated < 2) fail(`expected 2 modules, got ${result.moduleHydrated}`);
  if (result.tenantId !== tenantId) fail("tenant mismatch");
  if (getPersistenceMode() !== "api") fail("registry not api");

  const board = readPersistedJson<{ columns?: { id: string }[] }>(probeKey, {});
  if (!board.columns?.[0] || board.columns[0].id !== "new") {
    fail("module hydrate did not seed leads board");
  }
  console.log("   OK —", result.transport, "hydrated", result.moduleHydrated);

  console.log("\n2) Session fallback without CRM URL…");
  const sessionCut = await runLiveApiCutover({
    baseUrl: null,
    bridge: {
      authenticated: true,
      tenantId: "tenant_finconnex",
      accessToken: "x",
    },
  });
  if (sessionCut.transport !== "session") {
    fail(`expected session transport without URL, got ${sessionCut.transport}`);
  }
  console.log("   OK — session transport");

  console.log("\n3) Routes + files…");
  if (LEAD_CARD_HYDRATE_KEYS.length !== m.hydrateKeys.length) {
    fail("hydrate key drift");
  }
  const tokenRoute = path.join(
    repoRoot(),
    "src/app/api/auth/crm-token/route.ts",
  );
  if (!existsSync(tokenRoute)) fail("crm-token route missing");
  const providers = readFileSync(
    path.join(repoRoot(), "src/components/persistence/PersistenceBootstrap.tsx"),
    "utf8",
  );
  if (!providers.includes("runLiveApiCutover")) {
    fail("PersistenceBootstrap must use runLiveApiCutover");
  }
  assertDoc("docs/lead-card/phase-14-cutover.md", [
    "Session 14",
    "runLiveApiCutover",
    "crm-token",
    "Phase 15",
  ]);
  assertDoc("docs/lead-card/README.md", ["phase-14", "Session 14"]);
  console.log("   OK");

  console.log("\nSMOKE OK — Session 14 (live API cutover scaffolded)");
}

runAsCli(async () => {
  await runSmokeSession14();
});
