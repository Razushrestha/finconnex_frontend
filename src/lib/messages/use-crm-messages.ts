"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listAllCrmMessages,
  listCrmMessages,
  listRecentCrmMessages,
  listUnreadCrmMessages,
  tryCrmMessage,
} from "@/lib/messages/api";
import { replaceCrmMessages } from "@/lib/messages/store";

export type MessagesDataSource = "api" | "demo";

export function useCrmMessages() {
  const [source, setSource] = useState<MessagesDataSource>("demo");
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
        const primary = await listCrmMessages();
        const [visible, recent, unread] = await Promise.all([
          tryCrmMessage(() => listAllCrmMessages()),
          tryCrmMessage(() => listRecentCrmMessages()),
          tryCrmMessage(() => listUnreadCrmMessages()),
        ]);
        if (cancelled) return;
        const remote = [
          ...primary,
          ...(visible ?? []),
          ...(recent ?? []),
          ...(unread ?? []),
        ];
        const byId = new Map(remote.map((row) => [row.id, row]));
        replaceCrmMessages([...byId.values()]);
        setSource("api");
        setError(null);
      } catch (err) {
        if (cancelled) return;
        replaceCrmMessages([]);
        setSource("demo");
        setError(err instanceof Error ? err.message : "Messages unavailable");
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
