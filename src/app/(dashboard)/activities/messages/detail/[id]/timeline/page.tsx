"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityRecordTimelinePage } from "@/components/activities/ActivityRecordTimelinePage";
import { listMessageTimeline } from "@/lib/activities/record-timeline";
import { findMessageById } from "@/lib/messages/store";
import type { Message } from "@/lib/messages/types";
import { onRulesChange } from "@/lib/rules";

export default function MessageTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    function load() {
      setMessage(findMessageById(id)?.message ?? null);
    }
    load();
    return onRulesChange(load);
  }, [id]);

  if (!message) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">
            Message not found
          </p>
          <button
            type="button"
            onClick={() => router.push("/activities/messages")}
            className="mt-3 rounded-lg bg-[#5A32A3] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Messages
          </button>
        </div>
      </div>
    );
  }

  return (
    <ActivityRecordTimelinePage
      backHref={`/activities/messages/detail/${message.id}`}
      backLabel="Back to message"
      eyebrow="Message timeline"
      title={message.subject}
      description="Create and delivery history for this message."
      events={listMessageTimeline(message)}
    />
  );
}
