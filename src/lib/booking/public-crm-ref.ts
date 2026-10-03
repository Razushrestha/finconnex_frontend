/**
 * Host side of guest booking: works out the slugs the backend's public booking
 * API addresses a page's CRM event type by, so they can be published with it.
 * Needs the host's CRM session; a guest's browser never calls this.
 */

import { ensureCrmSession } from "@/lib/activity-timeline/auth";
import {
  crmEventTypeIdOf,
  listCrmEventTypeHosts,
  listCrmEventTypes,
} from "@/lib/booking/api";
import { parseCrmPublicRef, type CrmPublicRef } from "@/lib/booking/public-crm";
import type { BookingPage } from "@/lib/booking/types";
import { getCrmWorkspace } from "@/lib/workspaces/api";

/** Pages are re-published on every save; slugs rarely change. */
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; ref: CrmPublicRef }>();

/** For tests. */
export function clearCrmPublicRefCache() {
  cache.clear();
}

/**
 * The public address of the page's CRM event type, or null when it cannot be
 * worked out (not signed in, no CRM event type, inactive / private event type,
 * no active host, CRM unreachable). Never throws.
 */
export async function resolveCrmPublicRef(
  page: Pick<BookingPage, "id" | "crmEventTypeId">,
): Promise<CrmPublicRef | null> {
  const eventTypeId = crmEventTypeIdOf(page);
  if (!eventTypeId) return null;

  try {
    const session = await ensureCrmSession();
    if (!session) return null;

    const key = `${session.workspaceId}:${eventTypeId}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.ref;

    const [workspace, eventTypes, hosts] = await Promise.all([
      getCrmWorkspace(session.workspaceId),
      listCrmEventTypes(),
      listCrmEventTypeHosts(eventTypeId),
    ]);
    const eventType = eventTypes.find((row) => row.id === eventTypeId);
    // The public API only serves active, public event types.
    if (!eventType || !eventType.active || eventType.isPublic === false) return null;

    const host = hosts.find((row) => row.active && row.slug);
    const ref = parseCrmPublicRef({
      workspaceSlug: workspace?.slug,
      hostSlug: host?.slug,
      eventTypeSlug: eventType.slug,
    });
    if (!ref) return null;

    cache.set(key, { at: Date.now(), ref });
    return ref;
  } catch {
    return null;
  }
}
