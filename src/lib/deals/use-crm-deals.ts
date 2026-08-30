"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCrmDealForecast,
  loadCrmDealsBoard,
  tryCrmDeal,
  type CrmDealForecast,
} from "@/lib/deals/api";
import { replaceCrmDealPipelines } from "@/lib/deals/store";

export type DealsDataSource = "api" | "demo";

export function useCrmDeals() {
  const [source, setSource] = useState<DealsDataSource>("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<CrmDealForecast | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const remote = await loadCrmDealsBoard();
        if (cancelled) return;
        replaceCrmDealPipelines(remote);
        setSource("api");
        const nextForecast = await tryCrmDeal(() => getCrmDealForecast());
        if (!cancelled) setForecast(nextForecast);
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Deals unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { source, loading, error, forecast, refresh };
}
