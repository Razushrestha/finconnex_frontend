"use client";

import { User2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkIcon } from "@/components/smart-links/LinkIcon";
import { SOCIAL_PLATFORM_META } from "./SocialMeta";
import type { BrokerHubConfig } from "@/lib/broker-hub/types";

interface BrokerHubPreviewProps {
  config: BrokerHubConfig;
}

export function BrokerHubPreview({ config }: BrokerHubPreviewProps) {
  const activeLinks = config.links
    .filter((l) => l.active)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="flex justify-center">
      {/* Phone frame */}
      <div className="relative h-[540px] w-[300px] overflow-hidden rounded-[2.25rem] border-4 border-slate-800 bg-slate-950 shadow-xl">
        {/* Notch */}
        <div className="absolute left-1/2 top-2 z-10 h-4 w-24 -translate-x-1/2 rounded-full bg-slate-800" />

        {/* Background grid texture */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-900" />

        {/* Content */}
        <div className="relative flex h-full flex-col items-center overflow-y-auto px-6 pb-6 pt-10 text-center">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-white/10">
            {config.profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.profile.avatarUrl}
                alt={config.profile.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-800 text-slate-400">
                <User2 className="h-6 w-6" />
              </div>
            )}
          </div>

          <h2 className="mt-3 text-base font-semibold text-white">
            {config.profile.title || "Your name here"}
          </h2>
          {config.profile.bio && (
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              {config.profile.bio}
            </p>
          )}

          <div className="mt-6 w-full space-y-2.5">
            {activeLinks.length === 0 && (
              <p className="text-xs text-slate-500">
                Your active links will appear here.
              </p>
            )}
            {activeLinks.map((link) => (
              <div
                key={link.id}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-transform",
                  link.highlight
                    ? "bg-white text-slate-900"
                    : "border border-white/10 bg-white/5 text-slate-100 backdrop-blur-sm",
                  link.animation === "pulse" && "animate-pulse",
                )}
              >
                <LinkIcon type={link.icon} className="h-4 w-4 shrink-0" />
                <div className="flex flex-col text-left leading-tight">
                  <span>{link.title || "Untitled link"}</span>
                  {link.subtitle && (
                    <span className="mt-0.5 text-[10px] font-normal uppercase tracking-wide text-primary">
                      {link.subtitle}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {config.socials.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {config.socials.map((social) => {
                const socialMeta = SOCIAL_PLATFORM_META[social.platform];
                if (!socialMeta) return null;
                const Icon = socialMeta.icon;

                return (
                  <a
                    key={social.id}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 backdrop-blur-sm transition-transform hover:scale-110 hover:bg-white/10 hover:text-white"
                    aria-label={social.platform}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          )}

          <p className="mt-auto pt-6 text-[10px] uppercase tracking-wide text-slate-600">
            Powered by Finconnex
          </p>
        </div>
      </div>
    </div>
  );
}
