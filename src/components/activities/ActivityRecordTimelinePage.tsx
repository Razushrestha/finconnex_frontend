"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { RecordTimeline } from "@/components/activities/RecordTimeline";
import type { RecordTimelineEvent } from "@/lib/activities/record-timeline";

export function ActivityRecordTimelinePage({
  backHref,
  backLabel,
  eyebrow,
  title,
  description,
  events,
}: {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  description?: string;
  events: RecordTimelineEvent[];
}) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-white px-6 py-6 lg:px-10">
      <button
        type="button"
        onClick={() => router.push(backHref)}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </button>
      <RecordTimeline
        eyebrow={eyebrow}
        title={title}
        description={description}
        events={events}
      />
    </div>
  );
}
