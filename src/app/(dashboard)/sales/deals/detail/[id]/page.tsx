"use client";

import { useEffect, useState } from "react";
import { DealDetailView } from "@/components/sales/deals/DealDetailView";
import { findDealById, listDealPipelines, mergeCrmDealsIntoBoard } from "@/lib/deals/store";
import { onRulesChange } from "@/lib/rules";
import { useParams } from "next/navigation";
import {
  getCrmDeal,
  listCrmDealContacts,
  tryCrmDeal,
} from "@/lib/deals/api";

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onRulesChange(() => setTick((n) => n + 1));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const remote = await tryCrmDeal(() => getCrmDeal(id));
      if (cancelled) return;
      if (remote) {
        const contacts = await tryCrmDeal(() => listCrmDealContacts(id));
        const primary = contacts?.[0];
        mergeCrmDealsIntoBoard([
          {
            ...remote,
            contact: primary?.name ?? remote.contact,
            contactId: primary?.contactId ?? remote.contactId,
          },
        ]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const location = findDealById(id);
  void tick;

  if (loading && !location) {
    return <div className="p-6 text-sm text-slate-500">Loading deal…</div>;
  }

  if (!location) {
    return <div className="p-6 text-sm text-slate-500">Deal not found.</div>;
  }

  return (
    <DealDetailView
      deal={location.deal}
      stage={location.stage}
      pipeline={location.pipeline}
      pipelineStages={listDealPipelines()[location.pipeline] ?? []}
    />
  );
}
