"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Building2,
  Briefcase,
  Clock,
  CalendarDays,
  Globe,
  Languages,
  DollarSign,
  SlidersHorizontal,
  Palette,
  Moon,
  PanelLeft,
  Image as ImageIcon,
  Sparkles,
  Mail,
  LogIn,
  Search,
  ListFilter,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import {
  hubGroupsForCategory,
  type SettingsCategory,
  type SettingsSubItem,
} from "@/lib/settings/settings-config";
import { cn } from "@/lib/utils";

const ITEM_ICONS: Record<string, LucideIcon> = {
  "company-profile": Building2,
  "business-information": Briefcase,
  "business-hours": Clock,
  holidays: CalendarDays,
  "time-zone": Clock,
  language: Globe,
  currency: DollarSign,
  "regional-settings": SlidersHorizontal,
  "multi-language": Languages,
  "multi-currency": DollarSign,
  "email-branding": Mail,
  "login-page-branding": LogIn,
  "white-label": Sparkles,
  themes: Palette,
  "dark-mode": Moon,
  "accent-colors": Palette,
  "sidebar-layout": PanelLeft,
  branding: ImageIcon,
  favicon: ImageIcon,
};

function hrefFor(category: SettingsCategory, slug: string) {
  return `/settings/${category.slug}/${slug}`;
}

function findItem(category: SettingsCategory, slug: string) {
  return category.items.find((item) => item.slug === slug);
}

export function SettingsCategoryHub({
  category,
}: {
  category: SettingsCategory;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hubGroupsForCategory(category)
      .map((group) => ({
        ...group,
        items: group.slugs
          .map((slug) => findItem(category, slug))
          .filter((item): item is SettingsSubItem => Boolean(item))
          .filter((item) => {
            if (!q) return true;
            return (
              item.title.toLowerCase().includes(q) ||
              (item.blurb ?? "").toLowerCase().includes(q) ||
              group.title.toLowerCase().includes(q)
            );
          }),
      }))
      .filter((group) => group.items.length > 0);
  }, [category, query]);

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">
          {category.title} Settings
        </h2>
        <p className="mt-2 max-w-[220px] text-[13px] leading-relaxed text-slate-500">
          {category.description}
        </p>

        <div className="mt-6 flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter settings"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#5A32A3] focus:ring-2 focus:ring-[#5A32A3]/15"
            />
          </label>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            aria-label="Filter settings"
          >
            <ListFilter className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <div>
        {groups.length === 0 ? (
          <p className="py-10 text-[13px] text-slate-500">
            No settings match “{query}”.
          </p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {groups.map((group) => (
              <section
                key={group.title}
                className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm"
              >
                <h3 className="mb-3 text-[14px] font-semibold text-slate-900">
                  {group.title}
                </h3>
                {group.variant === "appearance" ? (
                  <AppearanceCard
                    category={category}
                    items={group.items}
                  />
                ) : group.variant === "experience" ? (
                  <ExperienceCard
                    category={category}
                    items={group.items}
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {group.items.map((item) => (
                      <SettingRow
                        key={item.slug}
                        category={category}
                        item={item}
                        trailing={
                          item.slug === "regional-settings" ? (
                            <span className="hidden rounded-md border border-slate-100 bg-slate-50 px-1.5 py-1 text-[8px] leading-tight text-slate-400 sm:block">
                              Date / 2026
                              <br />
                              Time · 12:00
                            </span>
                          ) : undefined
                        }
                      />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingRow({
  category,
  item,
  trailing,
}: {
  category: SettingsCategory;
  item: SettingsSubItem;
  trailing?: ReactNode;
}) {
  const Icon = ITEM_ICONS[item.slug] ?? Building2;
  return (
    <li>
      <Link
        href={hrefFor(category, item.slug)}
        className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-100">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-slate-800">
            {item.title}
          </span>
          {item.blurb ? (
            <span className="block truncate text-[11px] text-slate-400">
              {item.blurb}
            </span>
          ) : null}
        </span>
        {trailing}
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-[#5A32A3]" />
      </Link>
    </li>
  );
}

function AppearanceCard({
  category,
  items,
}: {
  category: SettingsCategory;
  items: SettingsSubItem[];
}) {
  const bySlug = Object.fromEntries(items.map((item) => [item.slug, item]));
  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {bySlug.themes ? (
          <Link href={hrefFor(category, "themes")} className="min-w-0">
            <p className="text-[12px] font-medium text-slate-700">Themes</p>
            <span className="mt-1.5 inline-flex rounded-lg bg-slate-100 p-0.5">
              <span className="rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-500">
                Light
              </span>
              <span className="rounded-md bg-[#5A32A3] px-2.5 py-1 text-[11px] font-semibold text-white">
                Dark
              </span>
            </span>
          </Link>
        ) : null}
        {bySlug["accent-colors"] ? (
          <Link href={hrefFor(category, "accent-colors")} className="min-w-0">
            <p className="text-[12px] font-medium text-slate-700">
              Accent Colors
            </p>
            <p className="mt-1.5 text-[11px] text-slate-400">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#0d9488]" />
              Primary Teal
            </p>
            <p className="text-[11px] text-slate-400">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#2563eb]" />
              Secondary Blue
            </p>
          </Link>
        ) : null}
      </div>

      {bySlug["dark-mode"] ? (
        <Link
          href={hrefFor(category, "dark-mode")}
          className="flex items-center justify-between"
        >
          <span className="text-[12px] font-medium text-slate-700">
            Dark Mode
          </span>
          <span className="relative h-5 w-9 rounded-full bg-[#5A32A3]">
            <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
          </span>
        </Link>
      ) : null}

      {bySlug["accent-colors"] ? (
        <Link
          href={hrefFor(category, "accent-colors")}
          className="flex items-center justify-between"
        >
          <span className="text-[12px] font-medium text-slate-700">
            Accent Colors
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-4 w-4 rounded-full bg-[#5A32A3] ring-2 ring-[#5A32A3]/30" />
            <span className="h-4 w-4 rounded-full bg-sky-500" />
            <span className="h-4 w-4 rounded-full bg-slate-800" />
          </span>
        </Link>
      ) : null}

      {bySlug["sidebar-layout"] ? (
        <Link
          href={hrefFor(category, "sidebar-layout")}
          className="flex items-center justify-between gap-3"
        >
          <span className="text-[12px] font-medium text-slate-700">
            Sidebar Layout
          </span>
          <span className="flex items-center gap-1.5">
            <SidebarThumb active />
            <SidebarThumb />
            <SidebarThumb wide />
          </span>
        </Link>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-[12px] font-medium text-slate-700">
          Branding/Logos
        </p>
        <div className="flex gap-2">
          {bySlug.branding ? (
            <Link
              href={hrefFor(category, "branding")}
              className="flex w-[88px] flex-col items-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 hover:border-[#5A32A3]/40"
            >
              <span className="mb-1 flex h-8 w-10 items-center justify-center rounded-md bg-white text-slate-300 ring-1 ring-slate-200">
                <ImageIcon className="h-4 w-4" />
              </span>
              <span className="text-center text-[9px] font-medium text-slate-500">
                Company Logo
              </span>
            </Link>
          ) : null}
          {bySlug.favicon ? (
            <Link
              href={hrefFor(category, "favicon")}
              className="flex w-[72px] flex-col items-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 hover:border-[#5A32A3]/40"
            >
              <span className="mb-1 flex h-8 w-8 items-center justify-center rounded-md bg-[#5A32A3] text-[11px] font-bold text-white">
                F
              </span>
              <span className="text-center text-[9px] font-medium text-slate-500">
                Favicon
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SidebarThumb({
  active,
  wide,
}: {
  active?: boolean;
  wide?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex h-8 w-10 overflow-hidden rounded-md border bg-white",
        active ? "border-[#5A32A3] ring-1 ring-[#5A32A3]/30" : "border-slate-200",
      )}
    >
      <span
        className={cn(
          "h-full bg-slate-200",
          wide ? "w-5" : "w-2.5",
          active && "bg-[#5A32A3]",
        )}
      />
      <span className="flex-1 space-y-0.5 p-1">
        <span className="block h-1 rounded bg-slate-100" />
        <span className="block h-1 w-3/4 rounded bg-slate-100" />
      </span>
    </span>
  );
}

function ExperienceCard({
  category,
  items,
}: {
  category: SettingsCategory;
  items: SettingsSubItem[];
}) {
  const bySlug = Object.fromEntries(items.map((item) => [item.slug, item]));
  return (
    <ul className="divide-y divide-slate-100">
      {bySlug["multi-language"] ? (
        <SettingRow category={category} item={bySlug["multi-language"]} />
      ) : null}
      {bySlug["multi-currency"] ? (
        <SettingRow
          category={category}
          item={bySlug["multi-currency"]}
          trailing={<CurrencyThumbs />}
        />
      ) : null}
      {bySlug["email-branding"] ? (
        <SettingRow
          category={category}
          item={bySlug["email-branding"]}
          trailing={
            <span className="hidden h-8 w-12 rounded-md border border-slate-200 bg-gradient-to-br from-violet-50 to-white sm:block" />
          }
        />
      ) : null}
      {bySlug["login-page-branding"] ? (
        <SettingRow
          category={category}
          item={bySlug["login-page-branding"]}
          trailing={
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[9px] font-semibold text-slate-400">
              F
            </span>
          }
        />
      ) : null}
      {items
        .filter(
          (item) =>
            ![
              "multi-language",
              "multi-currency",
              "email-branding",
              "login-page-branding",
            ].includes(item.slug),
        )
        .map((item) => (
          <SettingRow key={item.slug} category={category} item={item} />
        ))}
    </ul>
  );
}

function CurrencyThumbs() {
  return (
    <span className="hidden items-center -space-x-1 sm:flex">
      {["AUD", "USD", "EUR"].map((code) => (
        <span
          key={code}
          className="flex h-7 w-9 items-center justify-center rounded border border-slate-200 bg-white text-[8px] font-bold text-slate-500 shadow-sm"
        >
          {code}
        </span>
      ))}
    </span>
  );
}
