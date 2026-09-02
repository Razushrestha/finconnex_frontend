"use client";

import { useState, useEffect } from "react";
import { BrokerHubBuilder } from "@/components/smart-links/BrokerHubBuilder";
import { type BrokerHubConfig } from "@/lib/broker-hub/types";
import { getBrokerHubTemplate } from "@/lib/broker-hub/templates";
import { useSearchParams } from "next/navigation";

const DRAFT_STORAGE_KEY = "broker-hub-draft";

export default function LinktreePage() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");

  const [initialConfig, setInitialConfig] = useState<BrokerHubConfig | null>(
    null,
  );

  useEffect(() => {
    // 1. Check if a customized draft exists in sessionStorage (from "Use This Template")
    // 1. Check if a customized draft exists in sessionStorage
    const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
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

    // 2. If a template was clicked via query param directly
    if (templateId) {
      const template = getBrokerHubTemplate(templateId);
      if (template) {
        setInitialConfig({
          brokerId: "me",
          hubName: template.label || "Broker Hub",
          profile: template.profile,
          links: template.links || [],
          socials: [],
          customization: { theme: "default", fontStyle: "sans" }, // <-- Default theme styling for templates
          published: false,
        });
        return;
      }
    }

    // 3. Fallback: Existing default configuration if no template was selected
    setInitialConfig({
      brokerId: "me",
      hubName: "Alex's Hub",
      profile: {
        slug: "",
        avatarUrl: null,
        title: "",
        bio: "",
      },
      links: [],
      socials: [],
      published: false,
    });
  }, [templateId]);

  const handleSave = async (config: BrokerHubConfig) => {
    // TODO(api): PATCH /brokers/me/hub
    console.log("Saving hub config", config);
  };

  // Prevent hydration/render mismatch until config is determined from storage
  if (!initialConfig) {
    return null;
  }

  return <BrokerHubBuilder initialConfig={initialConfig} onSave={handleSave} />;
}
