"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrokerHubBuilder } from "@/components/smart-links/BrokerHubBuilder";
import {
  getBrokerHubTemplate,
  getHubConfigForTemplate,
} from "@/lib/broker-hub/templates";
import type { BrokerHubConfig } from "@/lib/broker-hub/types";

const DRAFT_STORAGE_KEY = "broker-hub-draft";

function BuilderWorkspace() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const [initialConfig, setInitialConfig] = useState<BrokerHubConfig | null>(
    null,
  );

  useEffect(() => {
    const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft) as BrokerHubConfig & {
          templateId?: string;
        };
        if (!templateId || parsed.templateId === templateId) {
          setInitialConfig({
            ...parsed,
            links: parsed.links || [],
            socials: parsed.socials || [],
            customization: parsed.customization || {
              theme: "default",
              fontStyle: "sans",
            },
          });
          return;
        }
      } catch (e) {
        console.error("Failed to parse broker-hub draft", e);
      }
    }

    if (templateId) {
      const template = getBrokerHubTemplate(templateId);
      if (template) {
        setInitialConfig({
          brokerId: "me",
          hubName: template.label || "Broker Hub",
          profile: template.profile,
          links: template.links || [],
          socials: [],
          customization: { theme: "default", fontStyle: "sans" },
          published: false,
        });
        return;
      }
      setInitialConfig(getHubConfigForTemplate(templateId));
      return;
    }

    setInitialConfig(getHubConfigForTemplate("blank"));
  }, [templateId]);

  const handleSave = async (config: BrokerHubConfig) => {
    console.log("Saving hub config", config);
  };

  if (!initialConfig) {
    return null;
  }

  return (
    <BrokerHubBuilder
      key={templateId ?? "blank"}
      initialConfig={initialConfig}
      onSave={handleSave}
    />
  );
}

export default function SmartLinkBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-slate-50 text-[13px] text-slate-500">
          Loading builder…
        </div>
      }
    >
      <BuilderWorkspace />
    </Suspense>
  );
}
