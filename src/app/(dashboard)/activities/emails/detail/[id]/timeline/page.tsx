"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityRecordTimelinePage } from "@/components/activities/ActivityRecordTimelinePage";
import { listEmailTimeline } from "@/lib/activities/record-timeline";
import { resolveLiveEmail } from "@/lib/emails/api";
import type { Email } from "@/lib/emails/types";
import { onRulesChange } from "@/lib/rules";

export default function EmailTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [email, setEmail] = useState<Email | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next = await resolveLiveEmail(id);
      if (cancelled) return;
      setEmail(next);
      setReady(true);
    }
    setReady(false);
    void load();
    const off = onRulesChange(() => {
      void load();
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [id]);

  if (!ready) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <p className="text-sm text-slate-500">Loading email…</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Email not found</p>
          <button
            type="button"
            onClick={() => router.push("/activities/emails")}
            className="mt-3 rounded-lg bg-[#5A32A3] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Emails
          </button>
        </div>
      </div>
    );
  }

  return (
    <ActivityRecordTimelinePage
      backHref={`/activities/emails/detail/${email.id}`}
      backLabel="Back to email"
      eyebrow="Email timeline"
      title={email.subject}
      description="Create, send, and open history for this email."
      events={listEmailTimeline(email)}
    />
  );
}
