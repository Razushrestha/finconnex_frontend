"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import {
  getPublishedHubBySlug,
  type BrokerHubConfig,
} from "@/lib/broker-hub/types";
import { HubPreviewScreen } from "@/components/smart-links/HubPreviewScreen";

export default function PublicBrokerHubPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [hub, setHub] = useState<BrokerHubConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHub() {
      if (!slug) return;
      const data = await getPublishedHubBySlug(slug);
      setHub(data);
      setLoading(false);
    }
    loadHub();
  }, [slug]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#4f46e5] text-white/70 text-xs">
        Loading...
      </main>
    );
  }

  if (!hub || !hub.published) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#4f46e5]">
      <HubPreviewScreen config={hub} interactive className="min-h-screen" />
    </main>
  );
}
