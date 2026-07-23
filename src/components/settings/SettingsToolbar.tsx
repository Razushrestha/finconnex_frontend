"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Star,
  History,
  Plus,
  HelpCircle,
  UserRound,
  X,
} from "lucide-react";
import {
  SETTINGS_CATEGORIES,
  allSettingsPaths,
} from "@/lib/settings/settings-config";
import {
  isFavoriteSetting,
  listFavoriteSettings,
  listSettingsAudit,
  toggleFavoriteSetting,
} from "@/lib/settings/settings-store";
import { cn } from "@/lib/utils";

type Panel = "search" | "favorites" | "audit" | "quick" | null;

export function SettingsToolbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [audit, setAudit] = useState(listSettingsAudit());

  useEffect(() => {
    setFavorites(listFavoriteSettings());
    setAudit(listSettingsAudit());
  }, [pathname, panel]);

  const paths = useMemo(() => allSettingsPaths(), []);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return paths.slice(0, 12);
    return paths
      .filter(
        (p) =>
          p.item.title.toLowerCase().includes(q) ||
          p.category.title.toLowerCase().includes(q) ||
          p.category.section.includes(q) ||
          (p.item.blurb ?? "").toLowerCase().includes(q),
      )
      .slice(0, 24);
  }, [paths, query]);

  const currentPath = pathname ?? "";
  const favorited = isFavoriteSetting(currentPath);

  function open(next: Panel) {
    setPanel((p) => (p === next ? null : next));
  }

  return (
    <div className="relative border-b border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <p className="text-[10px] font-semibold tracking-wide text-violet-600 uppercase">
          §27 Settings · {SETTINGS_CATEGORIES.length} sections ·{" "}
          {paths.length} pages
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <ToolBtn
            active={panel === "search"}
            onClick={() => open("search")}
            icon={Search}
            label="Search Settings"
          />
          <ToolBtn
            active={panel === "favorites"}
            onClick={() => open("favorites")}
            icon={Star}
            label="Favorites"
          />
          <ToolBtn
            active={panel === "audit"}
            onClick={() => open("audit")}
            icon={History}
            label="Audit History"
          />
          <ToolBtn
            active={panel === "quick"}
            onClick={() => open("quick")}
            icon={Plus}
            label="Quick Create"
          />
          <Link
            href="/settings/help-and-support/knowledge-base"
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Help
          </Link>
          <Link
            href="/settings/my-preferences"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
          >
            <UserRound className="h-3.5 w-3.5" />
            My Preferences
          </Link>
          {currentPath.startsWith("/settings/") &&
            currentPath.split("/").length >= 4 && (
              <button
                type="button"
                onClick={() => {
                  setFavorites(toggleFavoriteSetting(currentPath));
                }}
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold",
                  favorited
                    ? "bg-amber-50 text-amber-700"
                    : "text-slate-500 hover:bg-slate-50",
                )}
                title="Toggle favorite for current page"
              >
                <Star
                  className={cn("h-3.5 w-3.5", favorited && "fill-amber-500")}
                />
                {favorited ? "Favorited" : "Favorite"}
              </button>
            )}
        </div>
      </div>

      {panel && (
        <div className="absolute inset-x-0 top-full z-40 border-b border-slate-200 bg-white shadow-lg">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[12px] font-bold text-slate-800">
                {panel === "search" && "Search Settings"}
                {panel === "favorites" && "Favorites"}
                {panel === "audit" && "Audit History"}
                {panel === "quick" && "Quick Create"}
              </h3>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {panel === "search" && (
              <>
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by section, page, or §27.x…"
                  className="mb-2 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
                <ul className="max-h-64 overflow-y-auto">
                  {results.map((r) => (
                    <li key={r.href}>
                      <button
                        type="button"
                        className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-violet-50"
                        onClick={() => {
                          router.push(r.href);
                          setPanel(null);
                        }}
                      >
                        <span className="shrink-0 text-[10px] font-semibold text-violet-600">
                          {r.category.section}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[12px] font-semibold text-slate-800">
                            {r.item.title}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {r.category.title}
                            {r.item.blurb ? ` · ${r.item.blurb}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {results.length === 0 && (
                    <li className="px-2 py-4 text-center text-[12px] text-slate-400">
                      No matches
                    </li>
                  )}
                </ul>
              </>
            )}

            {panel === "favorites" && (
              <ul className="max-h-64 overflow-y-auto">
                {favorites.length === 0 && (
                  <li className="py-4 text-center text-[12px] text-slate-400">
                    Star a settings page to pin it here.
                  </li>
                )}
                {favorites.map((href) => {
                  const hit = paths.find((p) => p.href === href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setPanel(null)}
                        className="block rounded-lg px-2 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-violet-50"
                      >
                        {hit
                          ? `${hit.category.section} · ${hit.item.title}`
                          : href}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {panel === "audit" && (
              <ul className="max-h-64 overflow-y-auto">
                {audit.length === 0 && (
                  <li className="py-4 text-center text-[12px] text-slate-400">
                    Saves will appear here.
                  </li>
                )}
                {audit.map((a) => (
                  <li
                    key={a.id}
                    className="border-b border-slate-50 px-2 py-1.5 text-[11px] last:border-0"
                  >
                    <span className="text-slate-400">{a.at}</span>
                    <span className="mx-1 font-semibold text-slate-800">
                      {a.title}
                    </span>
                    <span className="text-slate-400">· {a.actor}</span>
                    <Link
                      href={a.path}
                      className="ml-2 text-violet-600 hover:underline"
                      onClick={() => setPanel(null)}
                    >
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {panel === "quick" && (
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  {
                    label: "New user",
                    href: "/settings/users-and-access/users",
                  },
                  {
                    label: "New webhook",
                    href: "/settings/developer/webhooks",
                  },
                  {
                    label: "New API key",
                    href: "/settings/developer/api-keys",
                  },
                  {
                    label: "Connect Stripe",
                    href: "/settings/integrations/stripe",
                  },
                  {
                    label: "Industry preset",
                    href: "/settings/crm-configuration/industry-preset",
                  },
                  {
                    label: "Queue monitor",
                    href: "/settings/system/queue-monitor",
                  },
                ].map((q) => (
                  <Link
                    key={q.href}
                    href={q.href}
                    onClick={() => setPanel(null)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:border-violet-200 hover:bg-violet-50"
                  >
                    {q.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold",
        active
          ? "bg-violet-600 text-white"
          : "text-slate-600 hover:bg-slate-50",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
