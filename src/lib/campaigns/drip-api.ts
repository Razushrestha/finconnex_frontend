import { ensureCrmAccess, ensureCrmSession } from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";

import { campaignsPath } from "./api";

export type CampaignStep = {
  id: string;
  campaignId: string;
  stepIndex: number;
  key: string;
  waitAfterPreviousMs: number;
  subjectLine: string | null;
  messageBody: string;
  templateId: string | null;
  skipIfEngaged: boolean;
};

export type CampaignStepInput = {
  key: string;
  waitAfterPreviousMs?: number;
  subjectLine?: string;
  messageBody: string;
  templateId?: string;
  skipIfEngaged?: boolean;
};

export type QuietHoursDay = {
  enabled: boolean;
  start?: string;
  end?: string;
};

export type QuietHoursConfig = {
  useQuietHours: boolean;
  timezone?: string;
  days?: Record<string, QuietHoursDay>;
};

export type CampaignStepFunnelEntry = {
  stepId: string;
  key: string;
  stepIndex: number;
  counts: Record<string, number>;
};

async function resolveAuth() {
  const scoped = await ensureCrmSession();
  if (scoped) return scoped;
  return ensureCrmAccess();
}

async function dripGet(campaignId: string, suffix: string): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to load drip sequence data");
  return crmFetch(auth, campaignsPath(`/${campaignId}${suffix}`));
}

async function dripMutate(
  campaignId: string,
  suffix: string,
  init: RequestInit,
): Promise<unknown> {
  const auth = await resolveAuth();
  if (!auth) throw new Error("Sign in to manage the drip sequence");
  return crmFetch(auth, campaignsPath(`/${campaignId}${suffix}`), init);
}

export async function getCrmCampaignSteps(campaignId: string): Promise<CampaignStep[]> {
  const data = await dripGet(campaignId, "/steps");
  return Array.isArray(data) ? (data as CampaignStep[]) : [];
}

export async function setCrmCampaignSteps(
  campaignId: string,
  steps: CampaignStepInput[],
): Promise<CampaignStep[]> {
  const data = await dripMutate(campaignId, "/steps", {
    method: "PUT",
    body: JSON.stringify({ steps }),
  });
  return Array.isArray(data) ? (data as CampaignStep[]) : [];
}

export async function setCrmCampaignQuietHours(
  campaignId: string,
  config: QuietHoursConfig,
): Promise<Record<string, unknown> | null> {
  const data = await dripMutate(campaignId, "/quiet-hours", {
    method: "PUT",
    body: JSON.stringify(config),
  });
  return (data as Record<string, unknown>) ?? null;
}

export async function launchCrmDripCampaign(
  campaignId: string,
  scheduledAt?: string,
): Promise<Record<string, unknown> | null> {
  const data = await dripMutate(campaignId, "/launch-drip", {
    method: "POST",
    body: JSON.stringify(scheduledAt ? { scheduledAt } : {}),
  });
  return (data as Record<string, unknown>) ?? null;
}

export async function pauseCrmDripCampaign(
  campaignId: string,
): Promise<Record<string, unknown> | null> {
  const data = await dripMutate(campaignId, "/pause-drip", {
    method: "POST",
    body: "{}",
  });
  return (data as Record<string, unknown>) ?? null;
}

export async function resumeCrmDripCampaign(
  campaignId: string,
): Promise<Record<string, unknown> | null> {
  const data = await dripMutate(campaignId, "/resume-drip", {
    method: "POST",
    body: "{}",
  });
  return (data as Record<string, unknown>) ?? null;
}

export async function getCrmCampaignStepFunnel(
  campaignId: string,
): Promise<CampaignStepFunnelEntry[]> {
  const data = await dripGet(campaignId, "/step-funnel");
  return Array.isArray(data) ? (data as CampaignStepFunnelEntry[]) : [];
}
