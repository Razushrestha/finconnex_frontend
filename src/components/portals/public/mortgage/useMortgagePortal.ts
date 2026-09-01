"use client";

import { useCallback, useEffect, useState } from "react";
import { usePortalContext } from "@/components/portals/public/PortalShell";
import {
  getMortgageState,
  saveMortgageState,
  type MortgagePortalState,
} from "@/lib/portals/mortgage";

export function useMortgagePortal(slug: string) {
  const ctx = usePortalContext(slug);
  const [state, setState] = useState<MortgagePortalState | null>(null);

  const reload = useCallback(() => {
    if (!ctx.portal) return;
    setState(getMortgageState(slug, ctx.portal));
  }, [slug, ctx.portal]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    function onChange() {
      reload();
    }
    window.addEventListener("portal-mortgage-change", onChange);
    return () => window.removeEventListener("portal-mortgage-change", onChange);
  }, [reload]);

  function update(patch: (prev: MortgagePortalState) => MortgagePortalState) {
    if (!ctx.portal) return;
    setState((prev) => {
      if (!prev) return prev;
      const next = patch(prev);
      saveMortgageState(slug, next);
      return next;
    });
  }

  return { ...ctx, mortgage: state, update, reload };
}
