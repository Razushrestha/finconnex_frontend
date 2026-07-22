import { redirect } from "next/navigation";
import { SETTINGS_CATEGORIES } from "@/lib/settings/settings-config";

export default function SettingsRootPage() {
  const defaultCategory = SETTINGS_CATEGORIES[0];
  const defaultSubItem = defaultCategory.items[0];

  redirect(`/settings/${defaultCategory.slug}/${defaultSubItem.slug}`);
}
