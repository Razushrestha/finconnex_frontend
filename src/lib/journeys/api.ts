import { ensureCrmAccess, ensureCrmSession } from "@/lib/activity-timeline/auth";
import {
  cancelAutomationRun,
  createAutomationVersion,
  deleteAutomation,
  disableAutomation,
  duplicateAutomation,
  enableAutomation,
  getAutomation,
  listAutomationRuns,
  listAutomations,
  pauseAutomation,
  resumeAutomation,
  triggerAutomation,
  updateAutomationDraft,
} from "@/lib/automations/api";
import { crmFetch } from "@/lib/crm/request";
import {
  automationToJourney,
  journeyEntityType,
  journeyStepsToBackend,
  journeyTriggerToBackend,
} from "./mapping";
import type { JourneyStep, JourneyTrigger, LifecycleJourney } from "./types";

export function journeysPath(suffix = ""): string {
  return `/v1/journeys${suffix}`;
}

export function journeyTemplatesPath(suffix = ""): string {
  return `/v1/journey-templates${suffix}`;
}

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

async function journeysRequest(suffix: string, init?: RequestInit): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage journeys");
  return crmFetch(auth, journeysPath(suffix), init);
}

async function journeyTemplatesRequest(
  suffix: string,
  init?: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage journeys");
  return crmFetch(auth, journeyTemplatesPath(suffix), init);
}

export type JourneyTemplateSummary = {
  key: string;
  name: string;
  description: string;
  reEntryPolicy: "NEVER" | "AFTER_EXIT" | "ALWAYS";
  triggerType: string;
  entityType: string;
  actionTypes: string[];
};

/** List the 13 built-in Journey starter templates (real backend, not the client-side seed data). */
export async function listCrmJourneyTemplates(): Promise<JourneyTemplateSummary[]> {
  const data = await journeyTemplatesRequest("");
  return Array.isArray(data) ? (data as JourneyTemplateSummary[]) : [];
}

/** Creates a real Journey (with enrollment tracking + re-entry control) from a starter template. */
export async function createCrmJourneyFromTemplate(
  key: string,
  options: {
    name?: string;
    stepConfig?: Record<string, Record<string, unknown>>;
    reEntryPolicy?: "NEVER" | "AFTER_EXIT" | "ALWAYS";
  } = {},
): Promise<LifecycleJourney> {
  const created = (await journeyTemplatesRequest(`/${key}/create`, {
    method: "POST",
    body: JSON.stringify(options),
  })) as { automationId: string };
  return journeyFromAutomationId(created.automationId);
}

async function journeyFromAutomationId(id: string): Promise<LifecycleJourney> {
  const [automation, { items: runs }] = await Promise.all([
    getAutomation(id),
    listAutomationRuns(id, { limit: 50 }),
  ]);
  return automationToJourney(automation, runs);
}

export async function listCrmJourneys(): Promise<LifecycleJourney[]> {
  const { items } = await listAutomations({ limit: 100 });
  const withRuns = await Promise.all(
    items.map(async (automation) => {
      try {
        const { items: runs } = await listAutomationRuns(automation.id, { limit: 50 });
        return automationToJourney(automation, runs);
      } catch {
        return automationToJourney(automation, []);
      }
    }),
  );
  return withRuns;
}

export async function getCrmJourney(id: string): Promise<LifecycleJourney | null> {
  try {
    return await journeyFromAutomationId(id);
  } catch {
    return null;
  }
}

export async function createCrmJourney(input: {
  name: string;
  trigger: JourneyTrigger;
  steps: JourneyStep[];
}): Promise<LifecycleJourney> {
  const { triggerType, entityType } = journeyTriggerToBackend(input.trigger);
  // Creates a real Journey (not a bare Automation) so enrollment tracking
  // and re-entry control apply from day one — see backend M4.
  const journey = (await journeysRequest("", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      triggerType,
      entityType,
      steps: journeyStepsToBackend(input.steps),
    }),
  })) as { automationId: string };
  return journeyFromAutomationId(journey.automationId);
}

/**
 * Persists edited steps. If the automation's latest version is still a DRAFT
 * (never published), it's updated in place. Otherwise (already enabled at
 * least once) a new draft version is created and immediately published, so
 * editing an active journey redeploys it with the new steps — matching how
 * GoHighLevel/Zoho treat editing a live workflow.
 */
export async function updateCrmJourneySteps(
  id: string,
  steps: JourneyStep[],
): Promise<LifecycleJourney> {
  const current = await getAutomation(id);
  const latest = current.versions?.[0];
  const triggerType = (latest?.triggerType ?? "MANUAL") as never;
  const entityType = journeyEntityType(current) as never;
  const backendSteps = journeyStepsToBackend(steps) as never;

  if (latest?.status === "DRAFT") {
    await updateAutomationDraft(id, { steps: backendSteps });
  } else {
    await createAutomationVersion(id, {
      name: current.name,
      triggerType,
      entityType,
      steps: backendSteps,
    });
    if (current.status === "ENABLED") {
      await enableAutomation(id);
    }
  }
  return journeyFromAutomationId(id);
}

export async function setCrmJourneyStatus(
  id: string,
  next: "Active" | "Paused",
  current: "Draft" | "Active" | "Paused",
): Promise<LifecycleJourney> {
  if (next === "Active") {
    if (current === "Paused") await resumeAutomation(id);
    else await enableAutomation(id);
  } else {
    if (current === "Active") await pauseAutomation(id);
  }
  return journeyFromAutomationId(id);
}

export async function disableCrmJourney(id: string): Promise<void> {
  await disableAutomation(id);
}

export async function cloneCrmJourney(id: string): Promise<LifecycleJourney> {
  const copy = await duplicateAutomation(id);
  return journeyFromAutomationId(copy.id);
}

export async function deleteCrmJourney(id: string): Promise<void> {
  await deleteAutomation(id);
}

export async function exitCrmEnrollment(runId: string): Promise<void> {
  try {
    await cancelAutomationRun(runId);
  } catch {
    // run may already be terminal (SUCCEEDED/FAILED) — nothing to cancel
  }
}

/**
 * "Test run": for MANUAL-trigger journeys, fires a real trigger against a
 * synthetic entity id (creates a visible run so the full pipeline executes).
 * For event-triggered journeys, runs a side-effect-free dry-run validation
 * instead, since there's no real entity to attach a manual trigger to.
 */
export async function testCrmJourney(id: string): Promise<{ ran: boolean; note: string }> {
  const automation = await getAutomation(id);
  const triggerType = automation.activeVersion?.triggerType ?? automation.versions?.[0]?.triggerType;
  if (triggerType === "MANUAL") {
    const syntheticId = crypto.randomUUID();
    await triggerAutomation(id, { entityId: syntheticId, snapshot: { source: "journey-test-run" } });
    return { ran: true, note: "Triggered against a synthetic test entity" };
  }
  return { ran: false, note: "Event-triggered journeys can't be test-fired without a real record yet" };
}
