"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Camera, User2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkIcon } from "@/components/smart-links/LinkIcon";
import { SOCIAL_PLATFORM_META } from "@/components/smart-links/SocialMeta";
import {
  HUB_AVATAR_ACCEPT,
  readImageFileAsDataUrl,
} from "@/lib/broker-hub/avatar";
import type { BrokerHubConfig } from "@/lib/broker-hub/types";

const BIO_LINE_COUNT = 6;

function HubBio({ bio }: { bio: string }) {
  const measureRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(true);

  useEffect(() => {
    setExpanded(false);
  }, [bio]);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const measure = () => {
      const styles = window.getComputedStyle(el);
      const parsed = Number.parseFloat(styles.lineHeight);
      const lineHeight =
        Number.isFinite(parsed) && parsed > 0
          ? parsed
          : Number.parseFloat(styles.fontSize) * 1.625;
      setOverflows(el.scrollHeight > lineHeight * BIO_LINE_COUNT + 2);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [bio]);

  const forceToggle = bio.trim().length > 180;

  return (
    <div className="relative mt-2 w-full">
      <p
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute inset-x-0 top-0 w-full text-center text-[14px] font-normal leading-relaxed break-words"
      >
        {bio}
      </p>
      <p
        className={cn(
          "w-full text-center text-[14px] font-normal leading-relaxed text-pretty text-white/75 break-words",
          !expanded && "line-clamp-6",
        )}
      >
        {bio}
      </p>
      {forceToggle || overflows || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="relative z-10 mt-2 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold tracking-wide text-white hover:bg-white/30"
        >
          {expanded ? "See less" : "See more"}
        </button>
      ) : null}
    </div>
  );
}

interface HubPreviewScreenProps {
  config: BrokerHubConfig;
  onAvatarChange?: (avatarUrl: string | null) => void;
  interactive?: boolean;
  className?: string;
}

export function HubPreviewScreen({
  config,
  onAvatarChange,
  interactive = false,
  className,
}: HubPreviewScreenProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editable = typeof onAvatarChange === "function";
  const activeLinks = config.links
    .filter((link) => link.active)
    .sort((a, b) => a.order - b.order);
  const socials = config.socials ?? [];

  return (
    <div
      className={cn(
        "relative flex h-full min-h-[520px] flex-col overflow-hidden text-center",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#6d5efc] via-[#4f46e5] to-[#312e81]" />
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] w-full"
        viewBox="0 0 375 220"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0 88C62 28 118 148 188 92C248 44 312 118 375 72V220H0Z"
          fill="#3730a3"
          opacity="0.85"
        />
        <path
          d="M0 128C78 78 142 176 218 124C278 86 332 156 375 128V220H0Z"
          fill="#1e1b4b"
          opacity="0.9"
        />
      </svg>

      <div className="relative z-10 flex h-full min-h-0 flex-col items-center overflow-y-auto px-6 pb-7 pt-14">
        <div className="relative shrink-0">
          {editable ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-[88px] w-[88px] overflow-hidden rounded-full bg-white/15 ring-[3px] ring-white/70 hover:ring-white"
              aria-label="Change profile photo"
            >
              {config.profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={config.profile.avatarUrl}
                  alt={config.profile.title || "Profile photo"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-white/80">
                  <User2 className="h-9 w-9" />
                </span>
              )}
            </button>
          ) : (
            <div className="h-[88px] w-[88px] overflow-hidden rounded-full bg-white/15 ring-[3px] ring-white/70">
              {config.profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={config.profile.avatarUrl}
                  alt={config.profile.title || "Profile photo"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-white/80">
                  <User2 className="h-9 w-9" />
                </span>
              )}
            </div>
          )}
          {editable ? (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white text-indigo-700 shadow-md"
                aria-label="Edit profile photo"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept={HUB_AVATAR_ACCEPT}
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file || !onAvatarChange) return;
                  void readImageFileAsDataUrl(file)
                    .then(onAvatarChange)
                    .catch(() => undefined);
                }}
              />
            </>
          ) : null}
        </div>

        <div className="mt-6 flex w-full max-w-[240px] flex-col items-center">
          <h2 className="w-full text-center text-[26px] font-semibold leading-snug tracking-tight text-pretty text-white [overflow-wrap:normal] [word-break:keep-all]">
            {config.profile.title.trim() || "Your name here"}
          </h2>
          {config.profile.bio.trim() ? (
            <HubBio bio={config.profile.bio} />
          ) : null}
        </div>

        {activeLinks.length > 0 ? (
          <div className="mt-7 w-full space-y-2.5">
            {activeLinks.map((link) => {
              const className = cn(
                "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold",
                link.highlight
                  ? "bg-white text-slate-900"
                  : "border border-white/15 bg-white/10 text-white backdrop-blur-sm",
                link.animation === "pulse" && "animate-pulse",
                interactive && "hover:scale-[1.02]",
              );
              const inner = (
                <>
                  <LinkIcon type={link.icon} className="h-4 w-4 shrink-0" />
                  <span className="truncate">{link.title || "Untitled link"}</span>
                </>
              );
              return interactive && link.url ? (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {inner}
                </a>
              ) : (
                <div key={link.id} className={className}>
                  {inner}
                </div>
              );
            })}
          </div>
        ) : null}

        {socials.length > 0 ? (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4 text-white">
            {socials.map((social) => {
              const meta = SOCIAL_PLATFORM_META[social.platform];
              if (!meta) return null;
              const Icon = meta.icon;
              const icon = <Icon className="h-5 w-5" />;
              const href = social.url.trim();
              return interactive && href ? (
                <a
                  key={social.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={meta.label}
                  className="hover:opacity-80"
                >
                  {icon}
                </a>
              ) : (
                <span key={social.id} aria-label={meta.label}>
                  {icon}
                </span>
              );
            })}
          </div>
        ) : null}

        <p className="mt-auto pt-8 text-[10px] font-semibold tracking-[0.18em] text-white/55">
          POWERED BY FINCONNEX
        </p>
      </div>
    </div>
  );
}
