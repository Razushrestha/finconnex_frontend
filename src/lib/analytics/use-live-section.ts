"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalyticsSectionId } from "@/lib/analytics/library";
import { loadLiveSectionPage } from "@/lib/analytics/hydrate";
import {
  computeSectionPage,
  type SectionPageFilters,
  type SectionPageModel,
} from "@/lib/analytics/section-page";

export function useLiveSectionPage(
  sectionId: AnalyticsSectionId,
  filters: SectionPageFilters,
) {
  const now = useMemo(() => new Date(), [filters, sectionId]);
  const local = useMemo(
    () => computeSectionPage(sectionId, filters, now),
    [sectionId, filters, now],
  );
  const [data, setData] = useState<SectionPageModel>(local);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(local);
    let cancelled = false;
    setLoading(true);
    void loadLiveSectionPage(sectionId, filters, now)
      .then((live) => {
        if (!cancelled) setData(live.data);
      })
      .catch(() => {
        if (!cancelled) setData(local);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sectionId, filters, now, local]);

  return { data, loading };
}
