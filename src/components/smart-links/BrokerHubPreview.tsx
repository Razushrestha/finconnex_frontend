"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrokerHubConfig } from "@/lib/broker-hub/types";
import { HubPreviewScreen } from "./HubPreviewScreen";

interface BrokerHubPreviewProps {
  config: BrokerHubConfig;
  onAvatarChange?: (avatarUrl: string | null) => void;
}

export function BrokerHubPreview({
  config,
  onAvatarChange,
}: BrokerHubPreviewProps) {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h3 className="text-[15px] font-semibold text-slate-900">
              Live preview
            </h3>
          </div>
          <p className="mt-1 text-[13px] text-slate-500">
            See how your profile appears to others.
          </p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={cn(
              "flex h-8 w-8 items-center justify-center",
              device === "mobile"
                ? "bg-violet-50 text-violet-600"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600",
            )}
            aria-label="Mobile preview"
            aria-pressed={device === "mobile"}
          >
            <Smartphone className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={cn(
              "flex h-8 w-8 items-center justify-center border-l border-slate-200",
              device === "desktop"
                ? "bg-violet-50 text-violet-600"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600",
            )}
            aria-label="Desktop preview"
            aria-pressed={device === "desktop"}
          >
            <Monitor className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex justify-center bg-slate-50/80 py-6">
        {device === "mobile" ? (
          <div className="relative h-[620px] w-[300px] overflow-hidden rounded-[2.4rem] border-[7px] border-slate-950 bg-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
            <div className="absolute left-1/2 top-2 z-20 h-[18px] w-[88px] -translate-x-1/2 rounded-full bg-slate-950" />
            <HubPreviewScreen
              config={config}
              onAvatarChange={onAvatarChange}
              className="h-full"
            />
          </div>
        ) : (
          <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 shadow-lg">
            <div className="flex h-8 items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <HubPreviewScreen
              config={config}
              onAvatarChange={onAvatarChange}
              className="min-h-[520px]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
