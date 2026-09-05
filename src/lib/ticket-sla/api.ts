import { ensureCrmSession, type CrmSession } from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type { TicketSlaConfig } from "./types";

export function ticketSlaPath(workspaceId: string): string {
  return `/v1/workspaces/${workspaceId}/tickets/sla`;
}

async function requireSession(): Promise<CrmSession> {
  const session = await ensureCrmSession();
  if (!session) {
    throw new Error("Sign in with a workspace to manage ticket SLAs");
  }
  return session;
}

export async function getTicketSlaConfig(): Promise<TicketSlaConfig> {
  const session = await requireSession();
  return crmFetch<TicketSlaConfig>(session, ticketSlaPath(session.workspaceId));
}

export async function putTicketSlaConfig(
  config: TicketSlaConfig,
): Promise<TicketSlaConfig> {
  const session = await requireSession();
  return crmFetch<TicketSlaConfig>(session, ticketSlaPath(session.workspaceId), {
    method: "PUT",
    body: JSON.stringify(config),
  });
}
