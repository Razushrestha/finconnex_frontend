"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityRecordTimelinePage } from "@/components/activities/ActivityRecordTimelinePage";
import { listCallTimeline } from "@/lib/activities/record-timeline";
import { findCallById } from "@/lib/calls/store";
import type { Call } from "@/lib/calls/types";
import { onRulesChange } from "@/lib/rules";

export default function CallTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [call, setCall] = useState<Call | null>(null);

  useEffect(() => {
    function load() {
      setCall(findCallById(id)?.call ?? null);
    }
    load();
    return onRulesChange(load);
  }, [id]);

  if (!call) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Call not found</p>
          <button
            type="button"
            onClick={() => router.push("/activities/calls")}
            className="mt-3 rounded-lg bg-[#5A32A3] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Calls
          </button>
        </div>
      </div>
    );
  }

  return (
    <ActivityRecordTimelinePage
      backHref={`/activities/calls/detail/${call.id}`}
      backLabel="Back to call"
      eyebrow="Call timeline"
      title={call.subject}
      description="Every create, status change, note, reminder, and recording on this call."
      events={listCallTimeline(call)}
    />
  );
}
