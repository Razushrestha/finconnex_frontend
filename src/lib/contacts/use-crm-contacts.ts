"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCrmContacts } from "@/lib/contacts/api";
import { replaceCrmContactsOnBoard } from "@/lib/contacts/store";

export type ContactsDataSource = "api" | "empty";

export function useCrmContacts() {
  const [source, setSource] = useState<ContactsDataSource>("empty");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    replaceCrmContactsOnBoard([]);

    void (async () => {
      try {
        const remote = await loadCrmContacts();
        if (cancelled) return;
        replaceCrmContactsOnBoard(remote);
        setSource(remote.length ? "api" : "empty");
      } catch (err) {
        if (cancelled) return;
        replaceCrmContactsOnBoard([]);
        setSource("empty");
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
