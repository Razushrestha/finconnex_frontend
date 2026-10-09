import { notFound } from "next/navigation";
import { SettingsCategoryHub } from "@/components/settings/SettingsCategoryHub";
import { IntegrationsHubClient } from "@/components/settings/integrations/IntegrationsHubClient";
import { findSettingsCategory } from "@/lib/settings/settings-config";

export default async function SettingsCategoryHubPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await params;
  // Every third-party connection, as logo tiles with their own setup flows.
  if (categorySlug === "integrations") return <IntegrationsHubClient />;
  const category = findSettingsCategory(categorySlug);
  if (!category) notFound();

  return <SettingsCategoryHub category={category} />;
}
