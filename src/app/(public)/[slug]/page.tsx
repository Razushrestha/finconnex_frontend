"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import {
  getPublishedHubBySlug,
  type BrokerHubConfig,
} from "@/lib/broker-hub/types";
import { cn } from "@/lib/utils";
import { LinkIcon } from "@/components/smart-links/LinkIcon";
import { SOCIAL_PLATFORM_META } from "@/components/smart-links/SocialMeta";
import { User2 } from "lucide-react";

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
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400 text-xs">
        Loading...
      </main>
    );
  }

  if (!hub || !hub.published) {
    notFound();
  }

  const activeLinks = hub.links
    .filter((l) => l.active)
    .sort((a, b) => a.order - b.order);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Background grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-900" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-sm flex-col items-center px-6 py-12 text-center">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-white/10">
          {hub.profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hub.profile.avatarUrl}
              alt={hub.profile.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-800 text-slate-400">
              <User2 className="h-6 w-6" />
            </div>
          )}
        </div>

        <h1 className="mt-3 text-base font-semibold text-white">
          {hub.profile.title || "Your name here"}
        </h1>
        {hub.profile.bio && (
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            {hub.profile.bio}
          </p>
        )}

        <div className="mt-6 w-full space-y-2.5">
          {activeLinks.length === 0 && (
            <p className="text-xs text-slate-500">
              Your active links will appear here.
            </p>
          )}
          {activeLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-transform hover:scale-[1.02]",
                link.highlight
                  ? "bg-white text-slate-900"
                  : "border border-white/10 bg-white/5 text-slate-100 backdrop-blur-sm hover:bg-white/10",
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
            </a>
          ))}
        </div>

        {hub.socials && hub.socials.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {hub.socials.map((social) => {
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

        <a
          href="https://finconnex.io"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto pt-6 text-[10px] uppercase tracking-wide text-slate-600 hover:text-slate-400"
        >
          Powered by Finconnex
        </a>
      </div>
    </main>
  );
}
