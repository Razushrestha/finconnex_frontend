import { SettingsControlShell } from "@/components/settings/SettingsControlShell";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SettingsControlShell>{children}</SettingsControlShell>;
}
