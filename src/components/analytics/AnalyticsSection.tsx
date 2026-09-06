"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { analyticsSectionById } from "@/lib/analytics/library";
import { ActivityAnalytics } from "@/components/analytics/ActivityAnalytics";
import { CustomerAnalytics } from "@/components/analytics/CustomerAnalytics";
import { TeamAnalytics } from "@/components/analytics/TeamAnalytics";

export function AnalyticsSection({ sectionId }: { sectionId: string }) {
  const section = analyticsSectionById(sectionId);

  if (!section) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Unknown section.{" "}
        <Link href="/analytics" className="text-[#5A32A3] underline">
          Back to analytics
        </Link>
      </div>
    );
  }

  if (section.id === "customers") {
    return <CustomerAnalytics />;
  }

  if (section.id === "team") {
    return <TeamAnalytics />;
  }

  if (section.id === "activity") {
    return <ActivityAnalytics />;
  }

  return (
    <div className="min-h-full bg-[#F4F6F9]">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-4 p-4 lg:px-6 2xl:px-8 2xl:py-5">
        <Link
          href="/analytics"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Analytics
        </Link>
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900">{section.name}</h1>
          <p className="mt-1 text-[13px] text-slate-500">{section.description}</p>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-[14px] font-semibold text-slate-800">{section.name}</p>
          <p className="mt-1 text-[13px] text-slate-500">
            This section is ready. Analytics will be added here later.
          </p>
        </div>
      </div>
    </div>
  );
}
