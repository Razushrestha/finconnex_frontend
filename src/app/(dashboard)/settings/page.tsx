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
}
