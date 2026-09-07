"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchCrmRelatedRecords,
  mergeRelatedRecordOptions,
} from "@/lib/activities/related-records";
import type { RelatedEntityKind, RelatedTo } from "@/lib/activities/shared";

export function useCrmRelatedRecords(
  kind?: RelatedEntityKind | "",
  extra?: RelatedTo,
) {
  const [remote, setRemote] = useState<RelatedTo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!kind) {
      setRemote([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setRemote([]);
    void fetchCrmRelatedRecords(kind).then((rows) => {
      if (cancelled) return;
      setRemote(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const options = useMemo(
    () => mergeRelatedRecordOptions(remote, kind, extra),
    [remote, kind, extra],
  );

  return { options, loading, source: remote.length ? "api" : "local" };
}
