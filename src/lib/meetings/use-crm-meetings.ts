"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listCrmMeetings,
  listUpcomingCrmMeetings,
  tryCrmMeeting,
} from "@/lib/meetings/api";
import { replaceCrmMeetings } from "@/lib/meetings/store";

export type MeetingsDataSource = "api" | "demo";

export function useCrmMeetings() {
  const [source, setSource] = useState<MeetingsDataSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [all, upcoming] = await Promise.all([
          listCrmMeetings(),
          tryCrmMeeting(() => listUpcomingCrmMeetings()),
        ]);
        if (cancelled) return;
        const byId = new Map(all.map((row) => [row.id, row]));
        for (const row of upcoming ?? []) byId.set(row.id, row);
        replaceCrmMeetings([...byId.values()]);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Meetings unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { source, loading, error, refresh };
}
