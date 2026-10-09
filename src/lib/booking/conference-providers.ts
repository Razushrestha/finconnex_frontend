"use client";

import { useEffect, useState } from "react";

import {
  ensureCrmSession,
  isBoundCrmSession,
  type CrmSession,
} from "@/lib/activity-timeline/auth";
import { crmBffFetch, crmFetch, unwrapCrmData } from "@/lib/crm/request";
import type { OnlineMeetingPlatform } from "@/lib/booking/meeting-platforms";

/**
 * Which video platforms a booking can actually create links on, from the CRM
 * (GET /workspaces/:id/booking/conference-providers): Zoom when the server's
 * Zoom app is set up, Google Meet when the signed-in user has connected
 * Google Calendar. The consultation forms offer only these.
 */
export type MeetingPlatformStatus = {
  platform: OnlineMeetingPlatform;
  available: boolean;
  reason: string | null;
};

const NAMES: Record<string, OnlineMeetingPlatform> = {
  GOOGLE_MEET: "Google Meet",
  ZOOM: "Zoom",
};

export async function fetchMeetingPlatforms(): Promise<MeetingPlatformStatus[]> {
  const scoped = await ensureCrmSession();
  if (!scoped?.workspaceId) return [];
  const path = `/v1/workspaces/${scoped.workspaceId}/booking/conference-providers`;
  const json =
    isBoundCrmSession()
      ? await (async (session: CrmSession) => crmFetch(session, path))(scoped)
      : await crmBffFetch(path);
  const data = unwrapCrmData<{ providers?: unknown }>(json);
  const rows = Array.isArray(data?.providers) ? data.providers : [];
  return rows.flatMap((row) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const platform = NAMES[String(r.locationType ?? "")];
    if (!platform) return [];
    return [
      {
        platform,
        available: r.available === true,
        reason: typeof r.reason === "string" ? r.reason : null,
      },
    ];
  });
}

/** The integrated platforms (null while loading), and why the rest aren't. */
export function useMeetingPlatforms() {
  const [statuses, setStatuses] = useState<MeetingPlatformStatus[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchMeetingPlatforms()
        .then((rows) => {
          if (!alive) return;
          setStatuses(rows);
          setError("");
        })
        .catch(() => {
          if (!alive) return;
          setStatuses([]);
          setError("Could not check which meeting platforms are connected.");
        });
    void load();
    // A platform may be connected in another tab (Settings → Integrations).
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return {
    loading: statuses === null,
    platforms: (statuses ?? []).filter((s) => s.available).map((s) => s.platform),
    unavailable: (statuses ?? []).filter((s) => !s.available),
    error,
  };
}
