"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  Link2,
  Loader2,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";
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
    void navigator.clipboard.writeText(hubUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto w-full max-w-[1400px] space-y-5 p-4 sm:p-5 lg:p-6">
        <header className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            <a
              href={`/${config.profile.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
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

        {published ? (
          <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-900 animate-in fade-in slide-in-from-top-2 duration-300 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span>
                <strong>Successfully published!</strong> Your hub is live at:
              </span>
            </div>

            <div
              className="flex w-full items-center gap-2 sm:w-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="max-w-[220px] truncate rounded border border-border bg-background/80 px-2 py-1 font-mono text-xs text-foreground sm:max-w-xs">
                {hubUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex shrink-0 items-center gap-1 rounded border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
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
                className="flex shrink-0 items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                title="Open link in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Visit</span>
              </a>
            </div>
          </div>
        ) : null}

        <div className="grid w-full items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0">
            <BrokerHubEditor config={config} onChange={setConfig} />
          </div>

          <div className="xl:sticky xl:top-6">
            <BrokerHubPreview
              config={config}
              onAvatarChange={(avatarUrl) =>
                setConfig((current) => ({
                  ...current,
                  profile: { ...current.profile, avatarUrl },
                }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
