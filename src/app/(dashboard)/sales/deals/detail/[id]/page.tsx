"use client";

import { DealDetailView } from "@/components/sales/deals/DealDetailView";
import { DEAL_PIPELINE_STAGES, findDealById } from "@/lib/deals/types";
import { useParams } from "next/navigation";

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = findDealById(id);

  if (!location) {
    return <div className="p-6 text-sm text-slate-500">Deal not found.</div>;
  }

  return (
    <DealDetailView
      deal={location.deal}
      stage={location.stage}
      pipeline={location.pipeline}
      pipelineStages={DEAL_PIPELINE_STAGES[location.pipeline]}
    />
  );
}
