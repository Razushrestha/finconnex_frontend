"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCrmContacts } from "@/lib/contacts/api";
import { mergeCrmContactsIntoBoard } from "@/lib/contacts/store";

export type ContactsDataSource = "api" | "demo";

export function useCrmContacts() {
  const [source, setSource] = useState<ContactsDataSource>("demo");
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
        const remote = await loadCrmContacts();
        if (cancelled) return;
        if (remote.length) mergeCrmContactsIntoBoard(remote);
        setSource(remote.length ? "api" : "demo");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Contacts unavailable");
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
