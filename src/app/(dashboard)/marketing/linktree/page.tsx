"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrokerHubBuilder } from "@/components/smart-links/BrokerHubBuilder";
import type { BrokerHubConfig } from "@/lib/broker-hub/types";
import { getHubConfigForTemplate } from "@/lib/broker-hub/templates";
import {
  listCrmSmartHubs,
  saveBrokerHub,
  trySmartLink,
} from "@/lib/smart-links/api";
import { CreateLinktreeForm } from "@/components/marketing/linktree/CreateLinktreeForm";

export default function LinktreePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialConfig, setInitialConfig] = useState<BrokerHubConfig | null>(
    null,
  );
  const [source, setSource] = useState<"api" | "demo">("demo");
  const [createOpen, setCreateOpen] = useState(
    () => searchParams.get("create") === "1",
  );

  useEffect(() => {
    if (searchParams.get("create") === "1") setCreateOpen(true);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const hubs = await trySmartLink(() => listCrmSmartHubs());
      if (cancelled) return;
      if (hubs?.length) {
        setInitialConfig(hubs[0]);
        setSource("api");
        return;
      }
      if (hubs) {
        setInitialConfig(getHubConfigForTemplate("blank"));
        setSource("api");
        return;
      }
      setInitialConfig({
        brokerId: "me",
        hubName: "My Link Hub",
        profile: {
          slug: "my-hub",
          avatarUrl: null,
          title: "My Link Hub",
          bio: "",
        },
        links: [],
        socials: [],
        published: false,
      });
      setSource("demo");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (config: BrokerHubConfig) => {
    const saved = await saveBrokerHub(config);
    setSource("api");
    return saved;
  };

  if (!initialConfig) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 text-[13px] text-slate-500">
        Loading hub…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-h-full flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-2">
        <span
          className={
            source === "api"
              ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
              : "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
          }
        >
          {source === "api" ? "Live CRM" : "Demo"}
        </span>
      </div>
      <BrokerHubBuilder
        key={initialConfig.id ?? "new-hub"}
        initialConfig={initialConfig}
        onSave={handleSave}
      />
      <CreateLinktreeForm
        variant="modal"
        open={createOpen}
        onOpenChange={(next) => {
          setCreateOpen(next);
          if (!next && searchParams.get("create") === "1") {
            router.replace("/marketing/linktree");
          }
        }}
      />
    </div>
  );
}
