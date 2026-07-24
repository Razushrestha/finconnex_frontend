"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import {
  MY_PREFERENCES_TABS,
  findSettingsCategory,
  findSettingsPage,
} from "@/lib/settings/settings-config";

export function SettingsBreadcrumb() {
  const pathname = usePathname() || "";
  const parts = pathname.split("/").filter(Boolean);
  // settings | category | subpage?
  const categorySlug = parts[1];
  const subpageSlug = parts[2];

  let crumbs: { label: string; href?: string }[] = [
    { label: "Settings", href: "/settings" },
  ];

  if (categorySlug === "my-preferences") {
    crumbs = [
      { label: "Settings", href: "/settings" },
      { label: "My Preferences" },
    ];
  } else if (categorySlug) {
    const category = findSettingsCategory(categorySlug);
    if (category) {
      crumbs.push({
        label: `${category.section} ${category.title}`,
        href: `/settings/${category.slug}`,
      });
      if (subpageSlug) {
        const page = findSettingsPage(categorySlug, subpageSlug);
        if (page) crumbs.push({ label: page.item.title });
      }
    }
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="mt-0.5 flex flex-wrap items-center text-[11px] text-slate-400"
    >
      <Link href="/" className="flex items-center hover:text-slate-600">
        <Home className="mr-1 h-3 w-3" />
        Home
      </Link>
      {crumbs.map((c) => (
        <span key={c.label} className="flex items-center">
          <ChevronRight className="mx-1 h-3 w-3" />
          {c.href ? (
            <Link href={c.href} className="hover:text-slate-600">
              {c.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-600">{c.label}</span>
          )}
        </span>
      ))}
      {pathname.includes("my-preferences") && (
        <span className="sr-only">
          {MY_PREFERENCES_TABS.map((t) => t.title).join(", ")}
        </span>
      )}
    </nav>
  );
}
