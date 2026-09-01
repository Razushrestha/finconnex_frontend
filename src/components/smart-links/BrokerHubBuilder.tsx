"use client";

import { useState } from "react";
import { Eye, Link2, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  saveHubConfigToLocalStorage,
  type BrokerHubConfig,
} from "@/lib/broker-hub/types";
import { BrokerHubEditor } from "./BrokerHubEditor";
import { BrokerHubPreview } from "./BrokerHubPreview";

interface BrokerHubBuilderProps {
  initialConfig: BrokerHubConfig;
  onSave?: (config: BrokerHubConfig) => Promise<void>;
}

export function BrokerHubBuilder({
  initialConfig,
  onSave,
}: BrokerHubBuilderProps) {
  const [config, setConfig] = useState<BrokerHubConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);

  const handlePublish = async () => {
    setSaving(true);
    setPublished(false);
    try {
      // Force published: true so the public route doesn't throw a 404
      const publishedConfig = { ...config, published: true };

      saveHubConfigToLocalStorage(publishedConfig);
      setConfig(publishedConfig);

      if (onSave) {
        await onSave(publishedConfig);
      }

      // Simulate a brief network delay for the spinner
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Show success state
      setPublished(true);
      setTimeout(() => setPublished(false), 2500); // Revert after 2.5 seconds
    } catch (error) {
      console.error("Failed to publish hub", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div></div>
        <div className="flex items-center gap-2">
          <a
            href={`/${config.profile.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </a>
          <button
            type="button"
            onClick={handlePublish}
            disabled={saving}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60",
              published
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : published ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            {saving ? "Publishing…" : published ? "Published!" : "Publish"}
          </button>
        </div>
      </header>

      <div className="grid w-full gap-8 lg:grid-cols-[420px_1fr]">
        <div className="min-w-0 max-w-[420px]">
          <BrokerHubEditor config={config} onChange={setConfig} />
        </div>

        <div className={cn("lg:sticky lg:top-6 lg:self-start")}>
          <BrokerHubPreview config={config} />
        </div>
      </div>
    </div>
  );
}
