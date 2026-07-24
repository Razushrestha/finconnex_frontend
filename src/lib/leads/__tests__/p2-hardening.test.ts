import { describe, expect, it } from "vitest";
import {
  assertUrgencyContrastAa,
  checkUrgencyContrast,
  LEAD_CARD_A11Y_CHECKLIST,
  WCAG_AA_NORMAL,
} from "@/lib/leads/a11y-urgency";
import {
  ESCALATION_ENABLED,
  FOREVER_NEUTRAL_QUICK_ACTIONS,
  OWNER_AVATAR_DEFAULT,
  PUSH_NOTIFICATIONS_FOR_CARD,
  UNREPLIED_THRESHOLD_HOURS_DEFAULT,
} from "@/lib/leads/product-decisions";
import { buildQuickActionStates } from "@/lib/leads/quick-actions";
import {
  createApiDriver,
  getPersistenceMode,
  setTenantContext,
  tenantScopedKey,
  enableSessionPersistence,
} from "@/lib/persistence";

describe("P2 product decisions", () => {
  it("locks unreplied threshold, owner default, escalation/push", () => {
    expect(UNREPLIED_THRESHOLD_HOURS_DEFAULT).toBe(24);
    expect(OWNER_AVATAR_DEFAULT).toBe(false);
    expect(ESCALATION_ENABLED).toBe(false);
    expect(PUSH_NOTIFICATIONS_FOR_CARD).toBe(false);
    expect([...FOREVER_NEUTRAL_QUICK_ACTIONS]).toEqual(["note", "attachment"]);
  });

  it("keeps note/attachment forever-neutral even with pending peers", () => {
    const states = buildQuickActionStates(
      [
        {
          id: "x",
          kind: "task",
          title: "x",
          dueAt: new Date(2020, 0, 1),
          createdAt: new Date(2020, 0, 1),
          bucket: "broken",
        },
      ],
      new Date(2026, 6, 23),
    );
    const note = states.find((s) => s.kind === "note");
    const att = states.find((s) => s.kind === "attachment");
    expect(note).toMatchObject({ urgency: "neutral", badgeCount: 0 });
    expect(att).toMatchObject({ urgency: "neutral", badgeCount: 0 });
  });
});

describe("P2 a11y contrast", () => {
  it("meets WCAG AA for red/amber/green surfaces and badges", () => {
    assertUrgencyContrastAa();
    for (const pair of checkUrgencyContrast()) {
      expect(pair.ratio).toBeGreaterThanOrEqual(pair.min);
    }
    expect(
      checkUrgencyContrast().every((p) =>
        p.id.includes("summary") ? p.min === WCAG_AA_NORMAL : true,
      ),
    ).toBe(true);
  });

  it("publishes a manual keyboard/SR checklist", () => {
    expect(LEAD_CARD_A11Y_CHECKLIST.length).toBeGreaterThanOrEqual(8);
    expect(LEAD_CARD_A11Y_CHECKLIST.join(" ")).toMatch(/screen reader|aria/i);
  });
});

describe("Phase 9 acceptance contracts", () => {
  it("exposes hydrate keys and product walk for sign-off", async () => {
    const { getPhase9Manifest, LEAD_CARD_HYDRATE_KEYS } = await import(
      "@/lib/leads/phase-9"
    );
    const m = getPhase9Manifest();
    expect(m.status).toBe("ready_for_acceptance");
    expect(m.hydrateKeys).toEqual([...LEAD_CARD_HYDRATE_KEYS]);
    expect(m.productWalk.length).toBeGreaterThanOrEqual(10);
    expect(m.nextPhase.id).toBe("lead-card-phase-10");
  });

  it("hydrate keys are still declared in owning stores", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const { assertHydrateKeysOwned } = await import("@/lib/leads/hydrate-keys");
    assertHydrateKeysOwned((rel) =>
      readFileSync(path.join(process.cwd(), rel), "utf8"),
    );
  });
});

describe("P2 persistence adapters", () => {
  it("scopes keys by tenant", () => {
    setTenantContext({ tenantId: "acme" });
    expect(tenantScopedKey("leads:board")).toBe("fc:acme:leads:board");
    setTenantContext(null);
    enableSessionPersistence();
    expect(getPersistenceMode()).toBe("session");
  });

  it("api driver caches sync reads after hydrate", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ value: JSON.stringify({ n: 1 }) }), {
        status: 200,
      });
    const api = createApiDriver({
      baseUrl: "https://api.example.test",
      getAccessToken: () => "tok",
      fetchImpl,
    });
    await api.hydrate(["demo:key"]);
    expect(JSON.parse(api.getItem("demo:key") ?? "null")).toEqual({ n: 1 });
  });
});

describe("Phase 10 adapter bootstrap", () => {
  it("mock KV roundtrips via bootstrapPersistence", async () => {
    const { bootstrapPersistence, createMockKvBackend, tenantScopedKey } =
      await import("@/lib/persistence");
    const { getPhase10Manifest } = await import("@/lib/leads/phase-10");

    expect(getPhase10Manifest().status).toBe("adapter_ready");

    const mock = createMockKvBackend();
    const key = "settings:values:v1";
    mock.seed(tenantScopedKey(key, "org-10"), JSON.stringify({ ok: true }));

    const boot = await bootstrapPersistence({
      mode: "api",
      baseUrl: "https://mock.test",
      tenantId: "org-10",
      getAccessToken: async () => "t",
      fetchImpl: mock.fetchImpl,
      hydrateKeys: [key],
    });
    expect(boot.mode).toBe("api");
    expect(boot.hydrated).toBe(true);

    await bootstrapPersistence({ mode: "session", tenantId: "demo" });
  });
});

describe("Phase 11 spec polish", () => {
  it("exposes status/tags fields and document-requested label", async () => {
    const { getPhase11Manifest } = await import("@/lib/leads/phase-11");
    const { LEAD_CARD_FIELD_OPTIONS } = await import(
      "@/lib/leads/lead-card-settings"
    );
    const { pickLastCompletedActivity } = await import(
      "@/lib/leads/activity-summary"
    );

    expect(getPhase11Manifest().status).toBe("spec_polish_complete");
    expect(LEAD_CARD_FIELD_OPTIONS.map((f) => f.key)).toEqual(
      expect.arrayContaining(["status", "tags"]),
    );

    const last = pickLastCompletedActivity([
      {
        id: "dr-test",
        kind: "document",
        title: "ID proof",
        dueAt: new Date(2026, 6, 18),
        createdAt: new Date(2026, 6, 18),
        bucket: "completed",
        sourceModule: "documents",
      },
    ]);
    expect(last?.label).toBe("Document requested");
  });
});

describe("Phase 12 timeline", () => {
  it("maps status audit events and a11y surface needles", async () => {
    const { getPhase12Manifest } = await import("@/lib/leads/phase-12");
    const { statusHistoryToCandidates } = await import(
      "@/lib/leads/lead-status-history"
    );
    const { pickLastCompletedActivity } = await import(
      "@/lib/leads/activity-summary"
    );
    const { LEAD_CARD_A11Y_SURFACE_FILES } = await import(
      "@/lib/leads/a11y-surface"
    );

    expect(getPhase12Manifest().status).toBe("timeline_complete");
    expect(LEAD_CARD_A11Y_SURFACE_FILES.length).toBeGreaterThanOrEqual(4);

    const status = statusHistoryToCandidates("Katherina Brooks");
    expect(status.some((c) => c.kind === "status_change")).toBe(true);
    expect(pickLastCompletedActivity(status)?.label).toBe("Status changed");
  });
});

describe("Phase 13 close-out", () => {
  it("awaits human sign-off and points to Phase 14", async () => {
    const { getPhase13Manifest, PHASE_13_NEXT_AFTER_ACCEPT } = await import(
      "@/lib/leads/phase-13"
    );
    const m = getPhase13Manifest();
    expect(m.status).toBe("awaiting_human_signoff");
    expect(m.humanExit.length).toBeGreaterThanOrEqual(5);
    expect(PHASE_13_NEXT_AFTER_ACCEPT[0]?.id).toBe("lead-card-phase-14");
  });
});

describe("Phase 14 cutover", () => {
  it("hydrates module routes via runLiveApiCutover", async () => {
    const { getPhase14Manifest } = await import("@/lib/leads/phase-14");
    const { createMockModuleApi, runLiveApiCutover, readPersistedJson } =
      await import("@/lib/persistence");

    expect(getPhase14Manifest().status).toBe("cutover_scaffolded");

    const mock = createMockModuleApi();
    mock.seedModule("activities:notes:list:v1", [{ id: "n1" }], "org-14");

    const result = await runLiveApiCutover({
      baseUrl: "https://mock.test",
      fetchImpl: mock.fetchImpl,
      hydrateKeys: ["activities:notes:list:v1"],
      bridge: {
        authenticated: true,
        tenantId: "org-14",
        accessToken: "t",
      },
    });
    expect(result.transport).toBe("module");
    expect(result.moduleHydrated).toBe(1);
    expect(readPersistedJson("activities:notes:list:v1", [])).toEqual([
      { id: "n1" },
    ]);
  });
});

describe("Phase 15 comms + files", () => {
  it("local upload and api send gateway contracts", async () => {
    const { getPhase15Manifest } = await import("@/lib/leads/phase-15");
    const {
      enableLocalUpload,
      getUploadAdapter,
    } = await import("@/lib/attachments/upload");
    const {
      createMockSendFetch,
      enableApiSendGateway,
      enableDeviceIntentGateway,
    } = await import("@/lib/comms/send-gateway");

    expect(getPhase15Manifest().status).toBe("comms_files_scaffolded");
    enableLocalUpload();
    const up = await getUploadAdapter().upload({
      fileName: "t.pdf",
      data: "x",
    });
    expect(up.ok).toBe(true);
    if (up.ok) expect(up.storageUrl.startsWith("local://")).toBe(true);

    const log: { path: string; body: unknown }[] = [];
    enableApiSendGateway({
      baseUrl: "https://mock.test",
      getAccessToken: async () => "t",
      fetchImpl: createMockSendFetch(log),
    });
    const { getSendGateway } = await import("@/lib/comms/send-gateway");
    await getSendGateway().sendSms({ phone: "+100", body: "hi" });
    expect(log.some((e) => e.path === "/v1/messages/send")).toBe(true);
    enableDeviceIntentGateway();
  });
});

describe("Phase 16 pipeline SLA", () => {
  it("computes stage and milestone bands", async () => {
    const { getPhase16Manifest } = await import("@/lib/leads/phase-16");
    const { computeLeadSla, leadStatusToPipelineStage } = await import(
      "@/lib/pipeline-sla/engine"
    );
    const { DEFAULT_MORTGAGE_PIPELINE_SLA } = await import(
      "@/lib/pipeline-sla/seed"
    );

    expect(getPhase16Manifest().status).toBe("pipeline_sla_shipped");
    expect(leadStatusToPipelineStage("Qualified")).toBe(
      "Waiting on Documents",
    );

    const now = new Date("2026-07-23T12:00:00");
    const onTrack = computeLeadSla({
      stage: "In Conversation",
      stageEnteredAt: new Date("2026-07-19T12:00:00"),
      pipelineStartedAt: new Date("2026-07-16T12:00:00"),
      config: DEFAULT_MORTGAGE_PIPELINE_SLA,
      now,
    });
    expect(onTrack.badgeLabel).toBe("On Track");

    const milestoneOverdue = computeLeadSla({
      stage: "In Conversation",
      stageEnteredAt: new Date("2026-07-20T09:00:00"),
      pipelineStartedAt: new Date("2026-07-01T09:00:00"),
      config: DEFAULT_MORTGAGE_PIPELINE_SLA,
      now,
    });
    expect(milestoneOverdue.badgeLabel).toBe("Milestone Overdue");
  });
});
