"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getPublishedHubBySlug,
  type BrokerHubConfig,
} from "@/lib/broker-hub/types";
import { fetchPublishedHubBySlug, trySmartLink } from "@/lib/smart-links/api";
import { HubPreviewScreen } from "@/components/smart-links/HubPreviewScreen";

export default function PublicBrokerHubPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [hub, setHub] = useState<BrokerHubConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHub() {
      if (!slug) return;
      const remote = await trySmartLink(() => fetchPublishedHubBySlug(slug));
      const data = remote ?? (await getPublishedHubBySlug(slug));
      setHub(data);
      setLoading(false);
    }
    void loadHub();
  }, [slug]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#4f46e5] text-white/70 text-xs">
        Loading...
      </main>
    );
  }

  if (!hub || !hub.published) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[#4f46e5] px-6 text-center text-white">
        <p className="text-sm font-semibold">Page not found</p>
        <p className="text-xs text-white/70">
          This hub is unpublished or is not on the server yet.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#4f46e5]">
      <HubPreviewScreen config={hub} interactive className="min-h-screen" />
    </main>
  );
}
