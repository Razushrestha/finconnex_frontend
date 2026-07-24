"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  bumpLinktreeView,
  getLinktreeBySlug,
  initials,
  isExternalHref,
  LINKTREE_ACCENT_STYLE,
  publicBookUrl,
  resolveLinkHref,
  whatsappHref,
  type LinktreePage,
} from "@/lib/marketing/linktree/types";
import { Calendar, Link2, Mail, MessageCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

function LinkButton({
  href,
  label,
  className,
  primary,
}: {
  href: string;
  label: string;
  className: string;
  primary?: boolean;
}) {
  const external = isExternalHref(href);
  const base = cn(
    "block w-full rounded-xl px-4 py-3.5 text-center text-[14px] font-semibold shadow-sm ring-1 transition",
    primary
      ? "bg-slate-900 text-white ring-slate-900 hover:bg-slate-800"
      : className,
  );
  if (external) {
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel="noreferrer"
        className={base}
      >
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={base}>
      {label}
    </Link>
  );
}

export function PublicLinktreeClient({ slug }: { slug: string }) {
  const [page, setPage] = useState<LinktreePage | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const live = getLinktreeBySlug(slug) ?? null;
    setPage(live);
    setHydrated(true);
    if (live?.status === "Live") {
      bumpLinktreeView(slug);
    }
  }, [slug]);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[13px] text-slate-400">
        Loading…
      </div>
    );
  }

  if (!page) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <Link2 className="mb-3 h-10 w-10 text-slate-300" />
        <h1 className="text-lg font-bold text-slate-900">Page not found</h1>
      </div>
    );
  }

  if (page.status !== "Live") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="text-lg font-bold text-slate-900">Page offline</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          This profile is {page.status.toLowerCase()}.
        </p>
      </div>
    );
  }

  const accent = LINKTREE_ACCENT_STYLE[page.accent];
  const bookingHref = page.bookingSlug
    ? publicBookUrl(page.bookingSlug)
    : null;

  return (
    <div
      className={cn(
        "relative min-h-dvh overflow-hidden bg-gradient-to-b",
        accent.wash,
      )}
    >
      <div className="relative mx-auto flex min-h-dvh max-w-[420px] flex-col px-4 py-12">
        <header className="mb-8 text-center">
          {page.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.avatarUrl}
              alt=""
              className="mx-auto mb-4 h-20 w-20 rounded-full object-cover shadow-md ring-2 ring-white"
            />
          ) : (
            <div
              className={cn(
                "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold shadow-md ring-2 ring-white",
                accent.avatar,
              )}
            >
              {initials(page.displayName)}
            </div>
          )}
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
            {page.displayName}
          </h1>
          {page.role ? (
            <p className="mt-0.5 text-[13px] font-medium text-slate-600">
              {page.role}
            </p>
          ) : null}
          {page.bio ? (
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-slate-500">
              {page.bio}
            </p>
          ) : null}

          {(page.phone || page.email || page.whatsapp) && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {page.phone ? (
                <a
                  href={`tel:${page.phone.replace(/\s/g, "")}`}
                  aria-label="Call"
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 ring-1 ring-black/5 transition",
                    accent.icon,
                  )}
                >
                  <Phone className="h-4 w-4" />
                </a>
              ) : null}
              {page.email ? (
                <a
                  href={`mailto:${page.email}`}
                  aria-label="Email"
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 ring-1 ring-black/5 transition",
                    accent.icon,
                  )}
                >
                  <Mail className="h-4 w-4" />
                </a>
              ) : null}
              {page.whatsapp ? (
                <a
                  href={whatsappHref(page.whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 ring-1 ring-black/5 transition",
                    accent.icon,
                  )}
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          )}
        </header>

        <div className="flex flex-1 flex-col gap-2.5">
          {bookingHref ? (
            <LinkButton
              href={bookingHref}
              label={page.bookingLabel || "Book a consult"}
              className={accent.button}
              primary
            />
          ) : null}
          {page.linkItems.map((l) => (
            <LinkButton
              key={l.id}
              href={resolveLinkHref(l)}
              label={l.label}
              className={accent.button}
            />
          ))}
        </div>

        <p className="mt-10 flex items-center justify-center gap-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          <Calendar className="h-3 w-3" />
          FinConnex
        </p>
      </div>
    </div>
  );
}
