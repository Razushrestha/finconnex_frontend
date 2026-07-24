import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  SETTINGS_REDIRECTS,
  findSettingsPage,
} from "@/lib/settings/settings-config";
import { SettingsFormClient } from "@/components/settings/SettingsFormClient";
import { RecycleBinSettingsClient } from "@/components/settings/RecycleBinSettingsClient";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ category: string; subpage: string }>;
}

export default async function SettingsSubPage({ params }: PageProps) {
  const { category: categorySlug, subpage: subpageSlug } = await params;

  const legacy = SETTINGS_REDIRECTS[`${categorySlug}/${subpageSlug}`];
  if (legacy) {
    redirect(`/settings/${legacy.category}/${legacy.subpage}`);
  }

  const hit = findSettingsPage(categorySlug, subpageSlug);
  if (!hit) notFound();

  const { category, item } = hit;
  const path = `/settings/${category.slug}/${item.slug}`;
  const isRecycleBin =
    category.slug === "data-management" && item.slug === "recycle-bin";

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
      <aside className="lg:col-span-1">
        <div className="sticky top-4 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
          <p className="mb-2 px-2 text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
            {category.section} · {category.title}
          </p>
          <nav className="max-h-[70vh] space-y-0.5 overflow-y-auto">
            {category.items.map((navItem) => {
              const active = navItem.slug === item.slug;
              return (
                <Link
                  key={navItem.slug}
                  href={`/settings/${category.slug}/${navItem.slug}`}
                  className={cn(
                    "block rounded-xl px-3 py-2 text-[12px] transition-colors",
                    active
                      ? "bg-violet-600 font-semibold text-white shadow-sm shadow-violet-600/20"
                      : "font-medium text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {navItem.title}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="lg:col-span-3">
        {isRecycleBin ? (
          <RecycleBinSettingsClient />
        ) : (
          <SettingsFormClient
            categorySlug={category.slug}
            subpageSlug={item.slug}
            path={path}
            moduleHref={item.moduleHref}
            moduleLabel={item.moduleLabel}
          />
        )}
      </div>
    </div>
  );
}
