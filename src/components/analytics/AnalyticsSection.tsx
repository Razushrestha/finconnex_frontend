"use client";

import Link from "next/link";
import { analyticsSectionById, isAnalyticsSectionId } from "@/lib/analytics/library";
import { SectionAnalytics } from "@/components/analytics/SectionAnalytics";

export function AnalyticsSection({
  sectionId,
}: {
  sectionId: string;
  sessionName?: string;
}) {
  const section = analyticsSectionById(sectionId);

  if (!section || !isAnalyticsSectionId(sectionId)) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Unknown section.{" "}
        <Link href="/analytics" className="text-[var(--brand-primary)] underline">
          Back to analytics
        </Link>
      </div>
    );
  }

  return <SectionAnalytics sectionId={sectionId} />;
}
