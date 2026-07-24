/**
 * Session 10 / Phase 10 smoke: API bootstrap + mock KV roundtrip + module routes.
 * Run: npx tsx src/lib/leads/smoke-session10.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { LEAD_CARD_HYDRATE_KEYS } from "@/lib/leads/phase-9";
import {
  getPhase10Manifest,
  PHASE_10_CUTOVER_CHECKLIST,
  PHASE_10_DELIVERED,
  PHASE_10_OUT_OF_SCOPE,
} from "@/lib/leads/phase-10";
import { bootstrapPersistence } from "@/lib/persistence/bootstrap";
import { createMockKvBackend } from "@/lib/persistence/mock-kv";
import {
  LEAD_CARD_MODULE_ROUTES,
  resolveModuleRestPath,
} from "@/lib/persistence/module-routes";
import {
  enableSessionPersistence,
  getPersistenceMode,
  readPersistedJson,
  tenantScopedKey,
  writePersistedJson,
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

export async function runSmokeSession10() {
  installSmokePolyfill();
  enableSessionPersistence();

  console.log("Phase 10 / Session 10 smoke…");

  const manifest = getPhase10Manifest();
  if (manifest.id !== "lead-card-phase-10") fail("bad phase id");
  if (manifest.status !== "adapter_ready") fail("bad status");
  if (PHASE_10_DELIVERED.length < 4) fail("delivered too short");
  if (PHASE_10_CUTOVER_CHECKLIST.length < 5) fail("cutover too short");
  if (PHASE_10_OUT_OF_SCOPE.length < 3) fail("out of scope too short");

  if (LEAD_CARD_MODULE_ROUTES.length !== LEAD_CARD_HYDRATE_KEYS.length) {
    fail("module routes count ≠ hydrate keys");
  }
  for (const key of LEAD_CARD_HYDRATE_KEYS) {
    if (!resolveModuleRestPath(key)) fail(`no module route for ${key}`);
  }

  const mock = createMockKvBackend();
  const probeKey = "sales:leads:board:v6";
  const tenantId = "tenant-s10";
  mock.seed(
    tenantScopedKey(probeKey, tenantId),
    JSON.stringify({ smoke: true, session: 10 }),
  );

  const boot = await bootstrapPersistence({
    mode: "api",
    baseUrl: "https://mock.finconnex.test",
    tenantId,
    getAccessToken: async () => "smoke-token",
    fetchImpl: mock.fetchImpl,
    hydrateKeys: [probeKey],
  });

  if (boot.mode !== "api") fail(`expected api mode, got ${boot.mode}`);
  if (boot.tenantId !== tenantId) fail("tenant not set");
  if (!boot.hydrated) fail("expected hydrate");
  if (getPersistenceMode() !== "api") fail("registry mode not api");

  const hydrated = readPersistedJson<{ smoke?: boolean; session?: number }>(
    probeKey,
    {},
  );
  if (!hydrated.smoke || hydrated.session !== 10) {
    fail("hydrate did not load mock KV value");
  }

  writePersistedJson(probeKey, { smoke: true, session: 10, written: true });
  /* allow async flush */
  await new Promise((r) => setTimeout(r, 20));
  const flushed = mock.store.get(tenantScopedKey(probeKey));
  if (!flushed?.includes('"written":true')) {
    fail("PUT flush did not update mock store");
  }

  const sessionBoot = await bootstrapPersistence({
    mode: "session",
    tenantId: "demo",
    hydrateKeys: [],
  });
  if (sessionBoot.mode !== "session") fail("session fallback failed");
  if (getPersistenceMode() !== "session") fail("registry not restored");

  assertDoc("docs/lead-card/phase-10-cutover.md", [
    "Session 10",
    "bootstrapPersistence",
    "NEXT_PUBLIC_CRM_API_URL",
  ]);
  assertDoc("docs/lead-card/api-adapter-runbook.md", [
    "bootstrapPersistence",
    "/v1/kv",
  ]);
  assertDoc("docs/lead-card/README.md", ["phase-10", "Session 10"]);

  const provider = path.join(
    repoRoot(),
    "src/components/persistence/PersistenceBootstrap.tsx",
  );
  if (!existsSync(provider)) fail("missing PersistenceBootstrap");
  const providers = readFileSync(
    path.join(repoRoot(), "src/app/providers.tsx"),
    "utf8",
  );
  if (!providers.includes("PersistenceBootstrap")) {
    fail("providers.tsx must mount PersistenceBootstrap");
  }

  console.log("Session 10 smoke OK — adapter bootstrap + mock KV ready.");
}

runAsCli(async () => {
  await runSmokeSession10();
});
