"use client";

import { useCallback, useEffect, useState } from "react";
import { listCrmProducts } from "@/lib/finance/products/api";
import { replaceCrmProducts } from "@/lib/finance/products/types";

export type ProductsDataSource = "api" | "demo";

export function useCrmProducts() {
  const [source, setSource] = useState<ProductsDataSource>("demo");
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
        const remote = await listCrmProducts();
        if (cancelled) return;
        replaceCrmProducts(remote);
        setSource("api");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Products unavailable");
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
