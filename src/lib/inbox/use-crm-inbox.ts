"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCrmConversation,
  listCrmConversations,
} from "@/lib/inbox/api";
import { crmConversationToInbox } from "@/lib/marketing/inbox/crm-map";
import { replaceCrmInboxConversations } from "@/lib/marketing/inbox/types";

export type InboxDataSource = "api" | "demo";

export function useCrmInbox() {
  const [source, setSource] = useState<InboxDataSource>("demo");
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
        const [conversations] = await listCrmConversations({ limit: 50 });
        if (cancelled) return;
        const mapped = await Promise.all(
          conversations.slice(0, 30).map(async (row) => {
            try {
              const detail = await getCrmConversation(row.id);
              return crmConversationToInbox(
                detail.conversation,
                detail.timeline,
              );
            } catch {
              return crmConversationToInbox(row);
            }
          }),
        );
        if (cancelled) return;
        replaceCrmInboxConversations(mapped);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Inbox unavailable");
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
