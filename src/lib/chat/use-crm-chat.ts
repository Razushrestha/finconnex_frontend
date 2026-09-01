"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCrmChatUnreadCount,
  listCrmConversations,
  listCrmChatMessages,
  markCrmConversationRead,
  markCrmMessageRead,
  tryCrmChat,
} from "@/lib/chat/api";
import type { ChatChannel, ChatMessage } from "@/lib/chat/types";

export type ChatDataSource = "api" | "demo";

export function useCrmChat(opts?: {
  activeConversationId?: string | null;
  seedChannels?: ChatChannel[];
}) {
  const [source, setSource] = useState<ChatDataSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<ChatChannel[] | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]> | null>(
    null,
  );
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const remote = await listCrmConversations();
        if (cancelled) return;
        setChannels(remote);
        setSource("api");
        const unread = await tryCrmChat(() => getCrmChatUnreadCount());
        if (!cancelled && unread != null) setUnreadTotal(unread);
      } catch (err) {
        if (cancelled) return;
        setChannels(null);
        setSource("demo");
        setError(err instanceof Error ? err.message : "Team Chat unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const activeId = opts?.activeConversationId;

  useEffect(() => {
    if (source !== "api" || !activeId) return;
    let cancelled = false;

    void (async () => {
      const thread = await tryCrmChat(() => listCrmChatMessages(activeId));
      if (cancelled || !thread) return;
      setMessages((prev) => ({ ...(prev ?? {}), [activeId]: thread }));
      void tryCrmChat(() => markCrmConversationRead(activeId));
      const last = thread[thread.length - 1];
      if (last?.id) {
        void tryCrmChat(() => markCrmMessageRead(last.id));
      }
      setChannels((prev) =>
        (prev ?? []).map((c) =>
          c.id === activeId ? { ...c, unread: 0 } : c,
        ),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [source, activeId, tick]);

  return {
    source,
    loading,
    error,
    channels,
    messages,
    unreadTotal,
    refresh,
    setChannels,
    setMessages,
  };
}
