"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCrmUnreadCount,
  listCrmNotifications,
  tryCrmNotification,
} from "@/lib/notifications/api";
import {
  countUnread,
  replaceCrmNotifications,
} from "@/lib/notifications/types";

export type NotificationsDataSource = "api" | "demo";

export function useCrmNotifications() {
  const [source, setSource] = useState<NotificationsDataSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [remote, count] = await Promise.all([
          listCrmNotifications(),
          tryCrmNotification(() => getCrmUnreadCount()),
        ]);
        if (cancelled) return;
        replaceCrmNotifications(remote);
        setUnreadCount(count ?? countUnread(remote));
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Notifications unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { source, loading, error, unreadCount, setUnreadCount, refresh };
}
