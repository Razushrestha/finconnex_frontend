"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ActivityRecordTimelinePage } from "@/components/activities/ActivityRecordTimelinePage";
import { listReminderTimeline } from "@/lib/activities/record-timeline";
import { reminders } from "@/lib/reminders/types";

export default function ReminderTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const reminder = reminders.find((item) => item.id === id) ?? null;

  if (!reminder) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">
            Reminder not found
          </p>
          <button
            type="button"
            onClick={() => router.push("/activities/reminders")}
            className="mt-3 rounded-lg bg-[#5A32A3] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Reminders
          </button>
        </div>
      </div>
    );
  }

  return (
    <ActivityRecordTimelinePage
      backHref={`/activities/reminders/detail/${reminder.id}`}
      backLabel="Back to reminder"
      eyebrow="Reminder timeline"
      title={reminder.title}
      description="Create and status history for this reminder."
      events={listReminderTimeline(reminder)}
    />
  );
}
