"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { enableProductionComms } from "@/lib/comms/production";
import { runLiveApiCutover } from "@/lib/persistence/cutover";

/**
 * Wires persistence + Phase 15 comms/upload after auth.
 * Runs once per tab — not on every client navigation.
 */
export function PersistenceBootstrap({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const started = useRef(false);

  useEffect(() => {
    if (pathname === "/login" || pathname.startsWith("/sign/")) return;
    if (started.current) return;
    started.current = true;
    void (async () => {
      const result = await runLiveApiCutover({
        hydrateKeys: [],
        useModuleRoutes: false,
      });
      await enableProductionComms({ bridge: result.auth });
      window.setTimeout(() => {
        void import("@/lib/booking/notify").then(({ flushDueBookingNotifications }) =>
          flushDueBookingNotifications(),
        );
      }, 8_000);
    })();
  }, [pathname]);

  return children;
}
