"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listCrmEmailCampaigns,
  listCrmSmsCampaigns,
  tryCrm,
} from "@/lib/campaigns/api";
import { mergeCrmEmailCampaigns } from "@/lib/marketing/email/types";
import { mergeCrmSmsCampaigns } from "@/lib/marketing/sms/types";

export type CampaignsDataSource = "api" | "demo";

export function useCrmCampaigns(channel: "email" | "sms" | "all" = "all") {
  const [source, setSource] = useState<CampaignsDataSource>("demo");
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
        let count = 0;
        if (channel === "email" || channel === "all") {
          const email = await listCrmEmailCampaigns();
          if (cancelled) return;
          if (email.length) {
            mergeCrmEmailCampaigns(email);
            count += email.length;
          }
        }
        if (channel === "sms" || channel === "all") {
          const sms = await tryCrm(() => listCrmSmsCampaigns());
          if (cancelled) return;
          if (sms?.length) {
            mergeCrmSmsCampaigns(sms);
            count += sms.length;
          }
        }
        setSource(count ? "api" : "demo");
      } catch (err) {
        if (cancelled) return;
        setSource("demo");
        setError(err instanceof Error ? err.message : "Campaigns unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [channel, tick]);

  return { source, loading, error, refresh };
}
