"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listCrmDocumentLibrary,
  listMyCrmDocuments,
  listRecentCrmDocuments,
  tryCrmDocument,
} from "@/lib/documents/library/api";
import {
  replaceLibraryDocuments,
  type LibraryDocument,
} from "@/lib/documents/library/types";

export type DocumentsDataSource = "api" | "demo";

export function useCrmDocuments() {
  const [source, setSource] = useState<DocumentsDataSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [mine, setMine] = useState<LibraryDocument[]>([]);
  const [recent, setRecent] = useState<LibraryDocument[]>([]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [library, myFiles, recentFiles] = await Promise.all([
          listCrmDocumentLibrary(),
          tryCrmDocument(() => listMyCrmDocuments()),
          tryCrmDocument(() => listRecentCrmDocuments()),
        ]);
        if (cancelled) return;
        replaceLibraryDocuments(library);
        setMine(myFiles ?? []);
        setRecent(recentFiles ?? []);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setMine([]);
        setRecent([]);
        setError(err instanceof Error ? err.message : "Documents unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { source, loading, error, refresh, mine, recent };
}
