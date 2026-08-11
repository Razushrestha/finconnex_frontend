"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { calls, type Call } from "@/lib/calls/types";
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

  useEffect(() => {
    const foundCall = calls.find((c) => c.id === id) || null;
    setCall(foundCall);
  }, [id]);

  if (!call) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center p-12 text-center">
        <h2 className="mb-2 text-lg font-bold text-foreground">
          Call Not Found
        </h2>
        <p className="mb-6 text-xs text-muted-foreground">
          The call record with ID <span className="font-mono">{id}</span> does
          not exist or may have been removed.
        </p>
        <button
          type="button"
          onClick={() => router.push("/activities/calls")}
          className="rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
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
    />
  );
}
