import { SettingsToolbar } from "@/components/settings/SettingsToolbar";
import { SettingsSectionNav } from "@/components/settings/SettingsSectionNav";
import { SettingsBreadcrumb } from "@/components/settings/SettingsBreadcrumb";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-full bg-slate-50 pb-10">
      <div className="relative border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-[18px] font-semibold tracking-tight text-slate-900">
              Settings
            </h1>
            <SettingsBreadcrumb />
          </div>
        </div>
      </div>

      <SettingsToolbar />
      <SettingsSectionNav />

      <div className="relative mx-auto max-w-7xl px-4 pt-5 sm:px-6">{children}</div>
    </div>
  );
}
