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
    if (pathname === "/login" || pathname.startsWith("/sign/")) return;
    void (async () => {
      const result = await runLiveApiCutover({
        hydrateKeys: [],
        useModuleRoutes: false,
      });
      await enableProductionComms({ bridge: result.auth });
    })();
  }, [pathname]);

  return children;
}
