"use client";

import { useEffect, useState } from "react";
import { hydrateReportSources } from "@/lib/reports/library/live";
import { REPORT_CATEGORY_IDS, type ReportCategoryId } from "@/lib/reports/library/types";

export function useReportLibraryLive(category: string) {
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const id = REPORT_CATEGORY_IDS.includes(category as ReportCategoryId)
      ? (category as ReportCategoryId)
      : null;
    if (!id) {
      setLoading(false);
      setLive(false);
      return;
    }
    setLoading(true);
    void (async () => {
      const ok = await hydrateReportSources(id);
      if (cancelled) return;
      setLive(ok);
      setRevision((n) => n + 1);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [category]);

  return { loading, live, revision };
}
