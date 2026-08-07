"use client";

import { LeadDetailView } from "@/components/sales/leads/LeadDetailView";
import { findLeadCardById } from "@/lib/leads/types";
import { useParams } from "next/navigation";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const card = findLeadCardById(id);

  if (!card) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Lead not found.</div>
    );
  }

  return <LeadDetailView card={card} />;
}
