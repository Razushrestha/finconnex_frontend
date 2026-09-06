"use client";

import { useEffect, useState } from "react";
import { LeadDetailView } from "@/components/sales/leads/LeadDetailView";
import { findLeadById } from "@/lib/leads/store";
import { findLeadCardById } from "@/lib/leads/types";
import {
  fetchLeadById,
  fetchLeadMortgage,
  hydrateCrmLeadRelated,
  mapCrmLeadToCard,
} from "@/lib/leads/api";
import { upsertLeadFromCard } from "@/lib/leads/store";
import {
  listCrmCustomFieldValues,
  tryCrmCustomField,
} from "@/lib/custom-fields/api";
import { listCrmWorkspaceMembers } from "@/lib/workspace-members/api";
import { FOLLOWERS_KEY } from "@/components/sales/leads/detail/LeadFollowersField";
import { useParams } from "next/navigation";
import type { LeadCardData } from "@/lib/leads/types";

function flattenMortgagePayload(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const rec = raw as Record<string, unknown>;
  const nested =
    rec.payload && typeof rec.payload === "object"
      ? (rec.payload as Record<string, unknown>)
      : rec;
  const source =
    nested.custom && typeof nested.custom === "object" && !Array.isArray(nested.custom)
      ? (nested.custom as Record<string, unknown>)
      : nested;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value == null) continue;
    if (typeof value === "string") out[key] = value;
    else if (typeof value === "number" || typeof value === "boolean") {
      out[key] = String(value);
    } else out[key] = JSON.stringify(value);
  }
  return out;
}

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
        const [values, mortgage, members] = await Promise.all([
          tryCrmCustomField(() => listCrmCustomFieldValues(mapped.id)),
          fetchLeadMortgage(mapped.id).catch(() => null),
          listCrmWorkspaceMembers().catch(() => []),
        ]);
        const mortgageCustom = flattenMortgagePayload(mortgage);
        const followerNames = (live.followerIds ?? [])
          .map((followerId) => {
            const member = members.find(
              (row) => row.userId === followerId || row.id === followerId,
            );
            return member?.name.trim() || followerId;
          })
          .filter(Boolean);
        const next = {
          ...mapped,
          custom: {
            ...mapped.custom,
            ...mortgageCustom,
            ...(values ?? {}),
            ...(followerNames.length
              ? { [FOLLOWERS_KEY]: JSON.stringify(followerNames) }
              : {}),
          },
        };
        upsertLeadFromCard(next);
        await hydrateCrmLeadRelated(next.id, next.name);
        setCard(next);
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
