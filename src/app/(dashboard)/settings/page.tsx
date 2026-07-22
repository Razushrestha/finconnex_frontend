<<<<<<< HEAD
import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/layout/ComingSoonPage";

export const metadata: Metadata = {
  title: "Settings — FinConnex",
  description: "Tenant and user settings.",
};

export default function SettingsPage() {
  return (
    <ComingSoonPage
      title="Settings"
      section="§27"
      description="Tenant preferences, users, integrations, and notification defaults will be configured here."
    />
  );
=======
import { redirect } from "next/navigation";
import { SETTINGS_CATEGORIES } from "@/lib/settings/settings-config";

export default function SettingsRootPage() {
  const defaultCategory = SETTINGS_CATEGORIES[0];
  const defaultSubItem = defaultCategory.items[0];

  redirect(`/settings/${defaultCategory.slug}/${defaultSubItem.slug}`);
>>>>>>> d3d8945ed8c07d2a3ed2a75752832d9ceaffa087
}
