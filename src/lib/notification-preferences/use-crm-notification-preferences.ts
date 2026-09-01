"use client";

import { useCallback, useEffect, useState } from "react";
import { getCrmNotificationPreferences } from "@/lib/notification-preferences/api";
import { replaceCrmNotificationPreferences } from "@/lib/notification-preferences/store";
import type { NotificationPreferences } from "@/lib/notification-preferences/types";

export type NotificationPreferencesSource = "api" | "demo";

export function useCrmNotificationPreferences() {
  const [source, setSource] = useState<NotificationPreferencesSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const remote = await getCrmNotificationPreferences();
        if (cancelled) return;
        replaceCrmNotificationPreferences(remote);
        setPrefs(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setPrefs(null);
        setError(
          err instanceof Error ? err.message : "Notification preferences unavailable",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { source, loading, error, prefs, setPrefs, refresh };
}
