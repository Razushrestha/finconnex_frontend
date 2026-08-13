"use client";

import { useEffect, useState } from "react";
import { DealDetailView } from "@/components/sales/deals/DealDetailView";
import { findDealById, listDealPipelines } from "@/lib/deals/store";
import { onRulesChange } from "@/lib/rules";
import { useParams } from "next/navigation";

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    return onRulesChange(() => setTick((n) => n + 1));
  }, []);

  const location = findDealById(id);
  void tick;

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
