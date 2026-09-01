"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityRecordTimelinePage } from "@/components/activities/ActivityRecordTimelinePage";
import { listMeetingTimeline } from "@/lib/activities/record-timeline";
import { findMeetingById } from "@/lib/meetings/store";
import type { Meeting } from "@/lib/meetings/types";
import { onRulesChange } from "@/lib/rules";

export default function MeetingTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    function load() {
      setMeeting(findMeetingById(id)?.meeting ?? null);
    }
    load();
    return onRulesChange(load);
  }, [id]);

  if (!meeting) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Meeting not found</p>
          <button
            type="button"
            onClick={() => router.push("/activities/meetings")}
            className="mt-3 rounded-lg bg-[#5A32A3] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Meetings
          </button>
        </div>
      </div>
    );
  }

  return (
    <ActivityRecordTimelinePage
      backHref={`/activities/meetings/detail/${meeting.id}`}
      backLabel="Back to meeting"
      eyebrow="Meeting timeline"
      title={meeting.title}
      description="Schedule, status, agenda, notes, and attendees for this meeting."
      events={listMeetingTimeline(meeting)}
    />
  );
}
