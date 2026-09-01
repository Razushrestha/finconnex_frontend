import { SettingsToolbar } from "@/components/settings/SettingsToolbar";
import { SettingsSectionNav } from "@/components/settings/SettingsSectionNav";
import { SettingsBreadcrumb } from "@/components/settings/SettingsBreadcrumb";
import { SettingsCrmBadge } from "@/components/settings/SettingsCrmBadge";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-full bg-slate-50 pb-10">
      <div className="relative border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between gap-3 px-4 py-3 sm:px-6 2xl:px-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <SettingsCrmBadge />
            </div>
            <SettingsBreadcrumb />
          </div>
        </div>
      </div>

      <SettingsToolbar />
      <SettingsSectionNav />

      <div className="relative mx-auto w-full max-w-[1920px] px-4 pt-5 sm:px-6 2xl:px-8">
        {children}
      </div>
    </div>
  );
}
