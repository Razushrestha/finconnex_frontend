import Link from "next/link";
import { notFound } from "next/navigation";
import { findSettingsCategory } from "@/lib/settings/settings-config";

export default async function SettingsCategoryHubPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await params;
  const category = findSettingsCategory(categorySlug);
  if (!category) notFound();

  return (
    <div>
      <div className="mb-4">
        <p className="text-[10px] font-semibold tracking-wide text-violet-600 uppercase">
          {category.section}
        </p>
        <h2 className="text-[17px] font-bold tracking-tight text-slate-900">
          {category.title}
        </h2>
        <p className="mt-1 max-w-2xl text-[12px] text-slate-500">
          {category.description}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {category.items.map((item) => (
          <Link
            key={item.slug}
            href={`/settings/${category.slug}/${item.slug}`}
            className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40"
          >
            <p className="text-[13px] font-semibold text-slate-900">
              {item.title}
            </p>
            {item.blurb ? (
              <p className="mt-0.5 text-[11px] text-slate-400">{item.blurb}</p>
            ) : (
              <p className="mt-0.5 text-[11px] text-slate-400">
                Open configuration
              </p>
            )}
            {item.moduleHref ? (
              <p className="mt-1 text-[10px] font-semibold text-violet-600">
                Linked → {item.moduleLabel || item.moduleHref}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
