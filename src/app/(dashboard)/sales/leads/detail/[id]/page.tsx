"use client";

import { useEffect, useState } from "react";
import { LeadDetailView } from "@/components/sales/leads/LeadDetailView";
import { findLeadById } from "@/lib/leads/store";
import { findLeadCardById } from "@/lib/leads/types";
import { fetchLeadById, mapCrmLeadToCard } from "@/lib/leads/api";
import { upsertLeadFromCard } from "@/lib/leads/store";
import { useParams } from "next/navigation";
import type { LeadCardData } from "@/lib/leads/types";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const local = findLeadById(id)?.card ?? findLeadCardById(id);
  const [card, setCard] = useState<LeadCardData | null>(local ?? null);
  const [loading, setLoading] = useState(!local);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const live = await fetchLeadById(id);
        if (cancelled || !live) {
          setLoading(false);
          return;
        }
        const mapped = mapCrmLeadToCard(live);
        upsertLeadFromCard(mapped);
        setCard(mapped);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading && !card) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading lead…</div>
    );
  }

  if (!card) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Lead not found.</div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <LeadDetailView card={card} />
    </div>
  );
}
