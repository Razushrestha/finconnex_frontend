"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  bumpLinktreeView,
  getLinktreeBySlug,
  type LinktreePage,
} from "@/lib/marketing/linktree/types";
import { Link2 } from "lucide-react";

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
          This link page is {page.status.toLowerCase()}.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-violet-50 via-slate-50 to-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.18),_transparent_55%)]"
      />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-lg font-bold text-white shadow-lg shadow-violet-600/25">
            {page.title.slice(0, 1).toUpperCase()}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {page.title}
          </h1>
          {page.bio ? (
            <p className="mt-1 text-[13px] text-slate-500">{page.bio}</p>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2.5">
          {page.linkItems.map((l) => {
            const href = l.url.startsWith("http") || l.url.startsWith("mailto:")
              ? l.url
              : l.url;
            const external =
              href.startsWith("http") || href.startsWith("mailto:");
            if (external) {
              return (
                <a
                  key={l.id}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="rounded-xl bg-white px-4 py-3.5 text-center text-[14px] font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-violet-600 hover:text-white hover:ring-violet-600"
                >
                  {l.label}
                </a>
              );
            }
            return (
              <Link
                key={l.id}
                href={href}
                className="rounded-xl bg-white px-4 py-3.5 text-center text-[14px] font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-violet-600 hover:text-white hover:ring-violet-600"
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <p className="mt-10 text-center text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          Powered by FinConnex
        </p>
      </div>
    </div>
  );
}
