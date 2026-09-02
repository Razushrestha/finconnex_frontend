"use client";

import { useState, useEffect } from "react";
import { Eye, Link2, Loader2, Check, Copy, ExternalLink } from "lucide-react";
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
  const [copied, setCopied] = useState(false);

  const hubUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${config.profile.slug || ""}`
      : `/${config.profile.slug || ""}`;

  // Hide toast when clicking anywhere on the document
  useEffect(() => {
    if (!published) return;

    const timer = setTimeout(() => {
      const handleDocumentClick = () => {
        setPublished(false);
      };

      document.addEventListener("click", handleDocumentClick);

      return () => {
        document.removeEventListener("click", handleDocumentClick);
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [published]);

  const handlePublish = async () => {
    setSaving(true);
    setPublished(false);
    try {
      const publishedConfig = { ...config, published: true };

      saveHubConfigToLocalStorage(publishedConfig);
      setConfig(publishedConfig);

      if (onSave) {
        await onSave(publishedConfig);
      }

      await new Promise((resolve) => setTimeout(resolve, 800));

      setPublished(true);
    } catch (error) {
      console.error("Failed to publish hub", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hubUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      {/* Success Toast with URL */}
      {published && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-900 dark:text-emerald-200 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shrink-0">
              <Check className="h-3.5 w-3.5" />
            </div>
            <span>
              <strong>Successfully published!</strong> Your hub is live at:
            </span>
          </div>

          <div
            className="flex items-center gap-2 w-full sm:w-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="rounded bg-background/80 px-2 py-1 text-xs font-mono text-foreground border border-border truncate max-w-[220px] sm:max-w-xs">
              {hubUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1 rounded bg-background px-2.5 py-1 text-xs font-medium border border-border hover:bg-muted shrink-0"
              title="Copy URL"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <a
              href={`/${config.profile.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 shrink-0"
              title="Open link in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Visit</span>
            </a>
          </div>
        </div>
      )}

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
