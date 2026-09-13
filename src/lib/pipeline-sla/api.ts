/**
 * Mortgage pipeline SLA — GET/PUT /v1/workspaces/:id/pipelines/mortgage/sla
 */

import {
  ensureCrmSession,
  isBoundCrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch } from "@/lib/crm/request";
import {
  parsePipelineSlaConfig,
  savePipelineSlaConfig,
} from "@/lib/pipeline-sla/settings";
import type { PipelineSlaConfig } from "@/lib/pipeline-sla/types";

export function mortgagePipelineSlaPath(workspaceId: string): string {
  return `/v1/workspaces/${workspaceId}/pipelines/mortgage/sla`;
}

async function slaCall(path: string, init?: RequestInit): Promise<unknown> {
  const scoped = await ensureCrmSession();
  if (!scoped?.workspaceId) throw new Error("Sign in to manage pipeline SLA");
  const resolved = path.replaceAll("{workspaceId}", scoped.workspaceId);
  if (isBoundCrmSession()) return crmFetch(scoped, resolved, init);
  return crmBffFetch(resolved, init);
}

export async function getCrmMortgagePipelineSla(): Promise<PipelineSlaConfig> {
  const raw = await slaCall(
    "/v1/workspaces/{workspaceId}/pipelines/mortgage/sla",
  );
  const parsed = parsePipelineSlaConfig(raw);
  return savePipelineSlaConfig(parsed);
}

export async function putCrmMortgagePipelineSla(
  config: PipelineSlaConfig,
): Promise<PipelineSlaConfig> {
  const body = {
    pipelineId: "mortgage" as const,
    pipelineName: config.pipelineName || "Mortgage",
    showBadgesOnCards: config.showBadgesOnCards === true,
    stageSlas: config.stageSlas.map((row) => ({
      stage: row.stage,
      duration: row.duration,
    })),
    milestones: config.milestones.map((row) => ({
      id: row.id,
      startStage: row.startStage,
      targetStage: row.targetStage,
      duration: row.duration,
    })),
  };
  const raw = await slaCall(
    "/v1/workspaces/{workspaceId}/pipelines/mortgage/sla",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return savePipelineSlaConfig(parsePipelineSlaConfig(raw));
}

export async function tryCrmMortgagePipelineSla<T>(
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}
