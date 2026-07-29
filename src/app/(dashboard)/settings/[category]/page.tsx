import { notFound } from "next/navigation";
import { SettingsCategoryHub } from "@/components/settings/SettingsCategoryHub";
import { findSettingsCategory } from "@/lib/settings/settings-config";

export default async function SettingsCategoryHubPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await params;
  const category = findSettingsCategory(categorySlug);
  if (!category) notFound();

  return <SettingsCategoryHub category={category} />;
}
