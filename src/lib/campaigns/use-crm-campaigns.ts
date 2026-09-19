"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listCrmEmailCampaigns,
  listCrmSmsCampaigns,
  listCrmWhatsAppCampaigns,
} from "@/lib/campaigns/api";
import { replaceCrmEmailCampaigns } from "@/lib/marketing/email/types";
import { replaceCrmSmsCampaigns } from "@/lib/marketing/sms/types";
import { replaceCrmWhatsAppCampaigns } from "@/lib/marketing/whatsapp/types";

export type CampaignsDataSource = "api" | "demo";

export function useCrmCampaigns(
  channel: "email" | "sms" | "whatsapp" | "all" = "all",
) {
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
        if (channel === "email" || channel === "all") {
          const email = await listCrmEmailCampaigns();
          if (cancelled) return;
          replaceCrmEmailCampaigns(email);
        }
        if (channel === "sms" || channel === "all") {
          const sms = await listCrmSmsCampaigns();
          if (cancelled) return;
          replaceCrmSmsCampaigns(sms);
        }
        if (channel === "whatsapp" || channel === "all") {
          const wa = await listCrmWhatsAppCampaigns();
          if (cancelled) return;
          replaceCrmWhatsAppCampaigns(wa);
        }
        if (!cancelled) setSource("api");
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
