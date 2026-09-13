"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Search } from "lucide-react";
import {
  SETTINGS_REDIRECTS,
  type SettingsCategory,
} from "@/lib/settings/settings-config";
import {
  SETTINGS_CONTROL_PANEL,
  type SettingsNavLink,
} from "@/lib/settings/settings-nav";
import { cn } from "@/lib/utils";

export function SettingsCategoryHub({
  category,
}: {
  category: SettingsCategory;
}) {
  const [query, setQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  const featured = useMemo(() => {
    const prefix = `/settings/${category.slug}/`;
    return SETTINGS_CONTROL_PANEL.flatMap((group) =>
      group.links.filter((link) => link.href.startsWith(prefix)),
    );
  }, [category.slug]);

  const leftover = useMemo(() => {
    const featuredSlugs = new Set(
      featured.map((link) => link.href.split("/").pop()),
    );
    return category.items.filter((item) => {
      if (featuredSlugs.has(item.slug)) return false;
      if (SETTINGS_REDIRECTS[`${category.slug}/${item.slug}`]) return false;
      return true;
    });
  }, [category, featured]);

  const q = query.trim().toLowerCase();
  const visibleFeatured = featured.filter(
    (link) =>
      !q ||
      link.title.toLowerCase().includes(q) ||
      link.blurb.toLowerCase().includes(q),
  );
  const visibleMore = leftover.filter(
    (item) =>
      !q ||
      item.title.toLowerCase().includes(q) ||
      (item.blurb ?? "").toLowerCase().includes(q),
  );

  const panel = SETTINGS_CONTROL_PANEL.find((group) =>
    group.links.some((link) => link.href.startsWith(`/settings/${category.slug}/`)),
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
          {panel?.title ?? category.title}
        </h1>
        <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-slate-500">
          {panel?.description ?? category.description}
        </p>
        <label className="relative mt-4 block max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter this section"
            className="h-10 w-full rounded-full border border-slate-200 bg-white pr-3 pl-9 text-[13px] outline-none focus:border-[#5A32A3] focus:ring-2 focus:ring-[#5A32A3]/15"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visibleFeatured.map((link) => (
          <FeaturedTile key={link.href} link={link} />
        ))}
      </div>

      {visibleFeatured.length === 0 && visibleMore.length === 0 ? (
        <p className="mt-8 text-[13px] text-slate-500">No settings match that filter.</p>
      ) : null}

      {visibleMore.length > 0 ? (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-[#5A32A3]"
          >
            More in {category.title}
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", moreOpen && "rotate-180")}
            />
          </button>
          {moreOpen ? (
            <ul className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {visibleMore.map((item) => (
                <li key={item.slug} className="border-b border-slate-50 last:border-0">
                  <Link
                    href={`/settings/${category.slug}/${item.slug}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                  >
                    <span>
                      <span className="block text-[13px] font-medium text-slate-800">
                        {item.title}
                      </span>
                      {item.blurb ? (
                        <span className="block text-[11px] text-slate-400">
                          {item.blurb}
                        </span>
                      ) : null}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FeaturedTile({ link }: { link: SettingsNavLink }) {
  return (
    <Link
      href={link.href}
      className="group rounded-3xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-[#5A32A3]/20"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-slate-900">{link.title}</h2>
        {link.live ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-emerald-700 uppercase">
            Live
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{link.blurb}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[#5A32A3]">
        Open
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
