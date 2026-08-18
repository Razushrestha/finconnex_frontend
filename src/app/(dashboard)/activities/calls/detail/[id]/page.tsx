"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Call } from "@/lib/calls/types";
import { findCallById } from "@/lib/calls/store";
import { onRulesChange } from "@/lib/rules";
import { CallDetailsLayout } from "@/components/activities/calls/detail/CallDetailsLayout";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function CallDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const [call, setCall] = useState<Call | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function load() {
      setCall(findCallById(id)?.call ?? null);
      setReady(true);
    }
    load();
    return onRulesChange(load);
  }, [id]);

  if (!ready) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <p className="text-sm text-slate-500">Loading call…</p>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center p-12 text-center">
        <h2 className="mb-2 text-lg font-bold text-slate-900">Call not found</h2>
        <p className="mb-6 text-xs text-slate-500">
          The call record with ID <span className="font-mono">{id}</span> does
          not exist or may have been removed.
        </p>
        <button
          type="button"
          onClick={() => router.push("/activities/calls")}
          className="rounded-xl bg-[#5A32A3] px-4 py-2 text-xs font-medium text-white hover:opacity-90"
        >
          Back to Calls
        </button>
      </div>
    );
  }

  return (
    <CallDetailsLayout
      call={call}
      onBack={() => router.push("/activities/calls")}
      onChange={setCall}
    />
  );
}
