import { crmWorkspaceFetch } from "@/lib/crm/request";
import { ensureCrmSession } from "@/lib/activity-timeline/auth";
import type { TicketSlaConfig } from "./types";

export function ticketSlaPath(workspaceId: string): string {
  return `/v1/workspaces/${workspaceId}/tickets/sla`;
}

async function slaPath(): Promise<string> {
  const session = await ensureCrmSession();
  if (!session?.workspaceId) {
    throw new Error("Sign in with a workspace to manage ticket SLAs");
  }
  return ticketSlaPath(session.workspaceId);
}

export async function getTicketSlaConfig(): Promise<TicketSlaConfig> {
  return crmWorkspaceFetch<TicketSlaConfig>(await slaPath());
}

export async function putTicketSlaConfig(
  config: TicketSlaConfig,
): Promise<TicketSlaConfig> {
  return crmWorkspaceFetch<TicketSlaConfig>(await slaPath(), {
    method: "PUT",
    body: JSON.stringify(config),
  });
}
