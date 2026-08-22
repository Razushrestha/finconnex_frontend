"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchParentActivityTimeline,
  fetchWorkspaceActivityTimeline,
} from "@/lib/activity-timeline/client";
import {
  candidatesToTimelineRows,
  toActivityTimelineRows,
  toTimelineFeedItems,
} from "@/lib/activity-timeline/map";
import type {
  ActivityParentType,
  ActivityTimelineFilters,
  ActivityTimelinePagination,
  ActivityTimelineRow,
  NormalizedActivityTimelineItem,
} from "@/lib/activity-timeline/types";
import type { TimelineItemData } from "@/components/sales/entity-detail/types";
import { listLeadActivityCandidates } from "@/lib/leads/activity-index";

export type ActivityTimelineSource = "api" | "local" | "empty";

export type UseParentActivityTimelineResult = {
  items: NormalizedActivityTimelineItem[];
  rows: ActivityTimelineRow[];
  feedItems: TimelineItemData[];
  metadata: ActivityTimelinePagination | null;
  loading: boolean;
  error: string | null;
  source: ActivityTimelineSource;
  refresh: () => void;
};

type ParentOptions = {
  relatedType: ActivityParentType;
  relatedId: string;
  /** Used only for local lead fallback when live API is unavailable. */
  leadNameFallback?: string;
  filters?: ActivityTimelineFilters;
  enabled?: boolean;
};

export function useParentActivityTimeline(
  options: ParentOptions,
): UseParentActivityTimelineResult {
  const {
    relatedType,
    relatedId,
    leadNameFallback,
    filters,
    enabled = true,
  } = options;

  const limit = filters?.limit ?? 8;
  const [items, setItems] = useState<NormalizedActivityTimelineItem[]>([]);
  const [rows, setRows] = useState<ActivityTimelineRow[]>([]);
  const [feedItems, setFeedItems] = useState<TimelineItemData[]>([]);
  const [metadata, setMetadata] = useState<ActivityTimelinePagination | null>(
    null,
  );
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<ActivityTimelineSource>("empty");
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!enabled || !relatedId) {
      setLoading(false);
      setItems([]);
      setRows([]);
      setFeedItems([]);
      setMetadata(null);
      setSource("empty");
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const page = await fetchParentActivityTimeline(
          relatedType,
          relatedId,
          { page: 1, limit, ...filters },
        );

        if (cancelled) return;

        if (page) {
          setItems(page.items);
          setRows(toActivityTimelineRows(page.items));
          setFeedItems(toTimelineFeedItems(page.items));
          setMetadata(page.metadata);
          setSource(page.items.length ? "api" : "empty");
          return;
        }

        // Local fallback for leads (demo / non-UUID ids)
        if (relatedType === "LEAD" && leadNameFallback) {
          const localRows = candidatesToTimelineRows(
            listLeadActivityCandidates(leadNameFallback),
            limit,
          );
          setItems([]);
          setRows(localRows);
          setFeedItems([]);
          setMetadata(null);
          setSource(localRows.length ? "local" : "empty");
          return;
        }

        setItems([]);
        setRows([]);
        setFeedItems([]);
        setMetadata(null);
        setSource("empty");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load timeline");

        if (relatedType === "LEAD" && leadNameFallback) {
          const localRows = candidatesToTimelineRows(
            listLeadActivityCandidates(leadNameFallback),
            limit,
          );
          setItems([]);
          setRows(localRows);
          setFeedItems([]);
          setMetadata(null);
          setSource(localRows.length ? "local" : "empty");
        } else {
          setItems([]);
          setRows([]);
          setFeedItems([]);
          setMetadata(null);
          setSource("empty");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    relatedType,
    relatedId,
    leadNameFallback,
    limit,
    tick,
    filters?.page,
    filters?.type,
    filters?.from,
    filters?.to,
  ]);

  return {
    items,
    rows,
    feedItems,
    metadata,
    loading,
    error,
    source,
    refresh,
  };
}

export function useWorkspaceActivityTimeline(
  filters: ActivityTimelineFilters = {},
  enabled = true,
) {
  const [items, setItems] = useState<NormalizedActivityTimelineItem[]>([]);
  const [rows, setRows] = useState<ActivityTimelineRow[]>([]);
  const [feedItems, setFeedItems] = useState<TimelineItemData[]>([]);
  const [metadata, setMetadata] = useState<ActivityTimelinePagination | null>(
    null,
  );
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const page = await fetchWorkspaceActivityTimeline({
          page: 1,
          limit: 25,
          ...filters,
        });
        if (cancelled) return;
        if (!page) {
          setItems([]);
          setRows([]);
          setFeedItems([]);
          setMetadata(null);
          return;
        }
        setItems(page.items);
        setRows(toActivityTimelineRows(page.items));
        setFeedItems(toTimelineFeedItems(page.items));
        setMetadata(page.metadata);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load timeline");
        setItems([]);
        setRows([]);
        setFeedItems([]);
        setMetadata(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [enabled, tick, filters.page, filters.limit, filters.type, filters.from, filters.to]);

  return { items, rows, feedItems, metadata, loading, error, refresh };
}
