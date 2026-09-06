"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrokerHubBuilder } from "@/components/smart-links/BrokerHubBuilder";
import {
  getBrokerHubTemplate,
  getHubConfigForTemplate,
} from "@/lib/broker-hub/templates";
import type { BrokerHubConfig } from "@/lib/broker-hub/types";
import { normalizeHubDraft } from "@/lib/broker-hub/types";
import {
  getCrmSmartHub,
  saveBrokerHub,
  trySmartLink,
} from "@/lib/smart-links/api";

const DRAFT_STORAGE_KEY = "broker-hub-draft";

function BuilderWorkspace() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const hubId = searchParams.get("hub");
  const [initialConfig, setInitialConfig] = useState<BrokerHubConfig | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (hubId) {
        const remote = await trySmartLink(() => getCrmSmartHub(hubId));
        if (!cancelled && remote) {
          setInitialConfig(remote);
          return;
        }
      }

      const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft) as unknown;
          const draft = normalizeHubDraft(parsed);
          const draftTemplate =
            draft?.templateId ??
            (parsed && typeof parsed === "object"
              ? (parsed as { templateId?: string }).templateId
              : undefined);
          if (draft && (!templateId || draftTemplate === templateId)) {
            if (!cancelled) {
              setInitialConfig({
                ...draft,
                templateId: draft.templateId ?? templateId ?? undefined,
              });
            }
            return;
          }
        } catch (e) {
          console.error("Failed to parse broker-hub draft", e);
        }
      }

      if (templateId) {
        const template = getBrokerHubTemplate(templateId);
        if (template) {
          if (!cancelled) {
            setInitialConfig({
              brokerId: "me",
              hubName: template.label || "Broker Hub",
              profile: template.profile,
              links: template.links || [],
              socials: [],
              customization: { theme: "default", fontStyle: "sans" },
              published: false,
              templateId,
            });
          }
          return;
        }
        if (!cancelled) {
          setInitialConfig({
            ...getHubConfigForTemplate(templateId),
            templateId,
          });
        }
        return;
      }

      if (!cancelled) {
        setInitialConfig(getHubConfigForTemplate("blank"));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [templateId, hubId]);

  const handleSave = async (config: BrokerHubConfig) => {
    return saveBrokerHub(config);
  };

  if (!initialConfig) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 text-[13px] text-slate-500">
        Loading builder…
      </div>
    );
  }

  return (
    <BrokerHubBuilder
      key={hubId ?? templateId ?? "blank"}
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
