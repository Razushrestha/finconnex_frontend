"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") return;
    void (async () => {
      await runLiveApiCutover();
      await enableProductionComms();
    })();
  }, [pathname]);

  return children;
}
