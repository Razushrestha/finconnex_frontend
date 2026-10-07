"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isCrmDocumentRequestId,
  listCrmDocumentRequests,
  receiveCrmDocumentRequest,
  tryCrmDocumentRequest,
} from "@/lib/documents/requests/api";
import { enrichDocumentRequestLabels } from "@/lib/documents/requests/labels";
import {
  applyClientProvideBundles,
  documentPackSignature,
  fetchClientProvideInbox,
  mergeReviewedDocumentItems,
} from "@/lib/documents/requests/provide-overlay";
import {
  listDocumentRequests,
  replaceDocumentRequests,
} from "@/lib/documents/requests/types";

export type DocumentRequestsDataSource = "api" | "demo";

const POLL_MS = 2000;

export function useCrmDocumentRequests() {
  const [source, setSource] = useState<DocumentRequestsDataSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    let pulling = false;

    async function pull(initial: boolean) {
      if (pulling) return;
      if (!initial && typeof document !== "undefined" && document.hidden) return;
      pulling = true;
      if (initial) {
        setLoading(true);
        setError(null);
      }
      try {
        const inbox = initial ? null : await fetchClientProvideInbox();
        if (cancelled) return;
        const previous = listDocumentRequests();
        const remote = initial
          ? await enrichDocumentRequestLabels(await listCrmDocumentRequests())
          : previous;
        if (cancelled) return;
        const clientFiles = initial ? await fetchClientProvideInbox() : inbox;
        if (cancelled) return;
        const merged = initial
          ? remote.map((row) => {
              const local = previous.find((item) => item.id === row.id);
              const remoteItems = row.items?.length ? row.items : local?.items;
              return {
                ...row,
                items: mergeReviewedDocumentItems(local?.items, remoteItems),
                timeline: local?.timeline ?? row.timeline,
                messages: local?.messages ?? row.messages,
                internalNotes: local?.internalNotes ?? row.internalNotes,
              };
            })
          : previous;
        const overlaid = clientFiles
          ? applyClientProvideBundles(merged, clientFiles)
          : merged;
        if (
          initial ||
          documentPackSignature(previous) !== documentPackSignature(overlaid)
        ) {
          replaceDocumentRequests(overlaid);
        }
        for (const row of overlaid) {
          const prev = previous.find((item) => item.id === row.id);
          if (
            row.status === "Received" &&
            prev?.status !== "Received" &&
            prev?.status !== "Approved" &&
            isCrmDocumentRequestId(row.id)
          ) {
            void tryCrmDocumentRequest(() => receiveCrmDocumentRequest(row.id));
          }
        }
        if (initial) setSource("api");
      } catch (err) {
        if (cancelled || !initial) return;
        setSource("demo");
        setError(
          err instanceof Error ? err.message : "Document requests unavailable",
        );
      } finally {
        pulling = false;
        if (initial && !cancelled) setLoading(false);
      }
    }

    void pull(true);
    const timer = window.setInterval(() => void pull(false), POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void pull(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tick]);

  return { source, loading, error, refresh };
}
