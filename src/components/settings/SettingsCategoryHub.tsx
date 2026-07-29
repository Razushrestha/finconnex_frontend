"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { SettingsCategory } from "@/lib/settings/settings-config";

export function SettingsCategoryHub({ category }: { category: SettingsCategory }) {
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return category.items;
    return category.items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.blurb ?? "").toLowerCase().includes(q),
    );
  }, [category.items, query]);

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">
          {category.title}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
          {category.description}
        </p>
        <p className="mt-4 text-[12px] text-slate-400">
          {category.items.length} settings
        </p>

        <label className="relative mt-5 block">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter settings"
            className="h-9 w-full rounded border border-slate-200 bg-white pr-3 pl-8 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
          />
        </label>
      </aside>

      <div>
        {items.length === 0 ? (
          <p className="py-10 text-[13px] text-slate-500">
            No settings match “{query}”.
          </p>
        ) : (
          <ul className="columns-1 gap-x-10 sm:columns-2">
            {items.map((item) => (
              <li key={item.slug} className="mb-1 break-inside-avoid">
                <Link
                  href={`/settings/${category.slug}/${item.slug}`}
                  className="group flex flex-col rounded px-2 py-2 transition-colors hover:bg-slate-100/80"
                >
                  <span className="text-[14px] font-medium text-slate-900 group-hover:underline group-hover:underline-offset-2">
                    {item.title}
                  </span>
                  {item.blurb ? (
                    <span className="mt-0.5 text-[12px] text-slate-500">
                      {item.blurb}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
