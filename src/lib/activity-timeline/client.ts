import {
  ensureCrmSession,
  isUuid,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmFetch } from "@/lib/crm/request";
import type {
  ActivityParentType,
  ActivityTimelineFilters,
  ActivityTimelinePage,
} from "@/lib/activity-timeline/types";

function toQuery(filters: ActivityTimelineFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.page != null) params.set("page", String(filters.page));
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.type) params.set("type", filters.type);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const q = params.toString();
  return q ? `?${q}` : "";
}

async function getJson(
  session: CrmSession,
  path: string,
  filters: ActivityTimelineFilters = {},
): Promise<ActivityTimelinePage> {
  const data = await crmFetch<ActivityTimelinePage | { items?: unknown }>(
    session,
    path,
  );
  const page =
    data && typeof data === "object" && Array.isArray((data as ActivityTimelinePage).items)
      ? (data as ActivityTimelinePage)
      : null;
  if (!page) {
    return {
      items: [],
      metadata: {
        currentPage: filters.page ?? 1,
        itemsPerPage: filters.limit ?? 25,
        totalItems: 0,
        totalPages: 0,
      },
    };
  }
  return {
    items: page.items,
    metadata: page.metadata ?? {
      currentPage: filters.page ?? 1,
      itemsPerPage: filters.limit ?? 25,
      totalItems: page.items.length,
      totalPages: 1,
    },
  };
}

/** Workspace-wide privacy-safe timeline. */
export async function fetchWorkspaceActivityTimeline(
  filters: ActivityTimelineFilters = {},
  sessionOverride?: CrmSession | null,
): Promise<ActivityTimelinePage | null> {
  const session = sessionOverride ?? (await ensureCrmSession());
  if (!session) return null;

  const path = `/v1/workspaces/${session.workspaceId}/activity-timeline${toQuery(filters)}`;
  return getJson(session, path, filters);
}

/**
 * Parent-authorized timeline for a CRM record.
 * Returns null when CRM session is unavailable or relatedId is not a UUID
 * (local demo ids cannot hit the live API).
 */
export async function fetchParentActivityTimeline(
  relatedType: ActivityParentType,
  relatedId: string,
  filters: ActivityTimelineFilters = {},
  sessionOverride?: CrmSession | null,
): Promise<ActivityTimelinePage | null> {
  if (!isUuid(relatedId)) return null;

  const session = sessionOverride ?? (await ensureCrmSession());
  if (!session) return null;

  const path = `/v1/workspaces/${session.workspaceId}/${relatedType}/${relatedId}/activity-timeline${toQuery(filters)}`;
  return getJson(session, path, filters);
}
