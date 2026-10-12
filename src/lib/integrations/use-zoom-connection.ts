"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getZoomConnection,
  type ZoomConnectionStatus,
} from "@/lib/integrations/api";

/**
 * The signed-in user's Zoom connection, for forms that offer to create a
 * Zoom meeting. Re-read when the window regains focus, because connecting
 * happens in another tab. `status` stays null until the CRM answers (or if it
 * cannot), so callers can treat "unknown" as "not connected".
 */
export function useZoomConnection() {
  const [status, setStatus] = useState<ZoomConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    getZoomConnection()
      .then((next) => {
        if (alive) setStatus(next);
      })
      .catch(() => {
        if (alive) setStatus(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  return {
    status,
    loading,
    /** Connected and working: a Zoom meeting can be created right now. */
    ready: Boolean(status?.connected && !status.needsReconnect),
    refresh,
  };
}
