/**
 * Analytics section live APIs + overlay.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/analytics/smoke.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ANALYTICS_SECTION_IDS } from "@/lib/analytics/library";
import {
  ANALYTICS_WIDGETS,
  overlaySectionPage,
} from "@/lib/analytics/crm";
import { SECTION_LIVE_APIS, loadLiveSectionPage } from "@/lib/analytics/hydrate";
import { computeSectionPage } from "@/lib/analytics/section-page";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";
import { seedCrmFixtures } from "@/test-support/crm-fixtures";
import { bindCrmLeadFetch } from "@/lib/leads/api/client";

const fail: (msg: string) => never = smokeFail;

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../..");
}

function readSrc(rel: string) {
  return readFileSync(path.join(repoRoot(), rel), "utf8");
}

export function smokeAnalyticsWiring() {
  if (ANALYTICS_WIDGETS.length !== 15) {
    fail(`expected 15 analytics widgets, got ${ANALYTICS_WIDGETS.length}`);
  }
  const crm = readSrc("src/lib/analytics/crm.ts");
  if (!crm.includes("/v1/analytics")) fail("analytics client missing /v1/analytics");
  if (!crm.includes("crmBffFetch")) fail("analytics widgets are not fetched via the CRM BFF");

  const section = readSrc("src/components/analytics/SectionAnalytics.tsx");
  if (!section.includes("useLiveSectionPage")) {
    fail("section pages do not load live CRM analytics");
  }

  for (const id of ANALYTICS_SECTION_IDS) {
    const apis = SECTION_LIVE_APIS[id];
    if (!apis?.length) fail(`no live APIs registered for ${id}`);
    if (!apis.some((row) => row.includes("/v1/analytics"))) {
      fail(`${id} is not connected to GET /v1/analytics`);
    }
  }
}

export async function smokeAnalyticsMock() {
  installSmokePolyfill();
  seedCrmFixtures(new Date(2026, 6, 23, 12, 0, 0));
  const hits: string[] = [];
  const orig = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    hits.push(url);
    const parsed = new URL(url, "http://localhost:3000");
    const widget = parsed.searchParams.get("widget");
    const body = widget
      ? {
          widget,
          period: { startDate: "2026-01-01", endDate: "2026-07-23", value: 42 },
          comparison: { startDate: "2025-01-01", endDate: "2025-07-23", value: 20 },
        }
      : { data: [] };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  bindCrmLeadFetch(globalThis.fetch);

  try {
    const july = new Date(2026, 6, 23, 12, 0, 0);
    const live = await loadLiveSectionPage(
      "leads",
      { dateRange: "this-year", owner: "All" },
      july,
    );
    if (!hits.some((url) => url.includes("/analytics"))) {
      fail("lead analytics did not GET /v1/analytics");
    }
    if (!hits.some((url) => url.includes("/leads"))) {
      fail("lead analytics did not GET /v1/leads");
    }
    const rate = live.data.kpis.find((row) => row.id === "rate");
    if (!rate || !rate.value.includes("42")) {
      fail("LEAD_CONVERSION_RATE overlay did not apply");
    }

    const base = computeSectionPage("business", { dateRange: "all", owner: "All" }, july);
    const overlaid = overlaySectionPage(
      "business",
      base,
      new Map([
        [
          "DEAL_WIN_RATE",
          {
            widget: "DEAL_WIN_RATE",
            period: { startDate: "2026-01-01", endDate: "2026-07-23", value: 33 },
          },
        ],
      ]),
    );
    const win = overlaid.kpis.find((row) => row.id === "win");
    if (!win || !String(win.value).includes("33")) {
      fail("DEAL_WIN_RATE overlay did not apply to business KPIs");
    }
  } finally {
    bindCrmLeadFetch(null);
    globalThis.fetch = orig;
  }
}

runAsCli(async () => {
  smokeAnalyticsWiring();
  await smokeAnalyticsMock();
  console.log("analytics smoke ok");
});
