"use client";

import { useEffect } from "react";
import { enableProductionComms } from "@/lib/comms/production";
import { runLiveApiCutover } from "@/lib/persistence/cutover";

/**
 * Wires persistence + Phase 15 comms/upload after auth.
 */
export function PersistenceBootstrap({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    void (async () => {
      await runLiveApiCutover();
      await enableProductionComms();
    })();
  }, []);

  return children;
}
