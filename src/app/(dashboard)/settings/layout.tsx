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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      <div className="relative border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-slate-900">
              Settings
            </h1>
            <SettingsBreadcrumb />
          </div>
          <span className="rounded-full bg-violet-100/80 px-2.5 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
            §27
          </span>
        </div>
      </div>

      <SettingsToolbar />
      <SettingsSectionNav />

      <div className="relative mx-auto max-w-7xl px-4 pt-4 sm:px-6">{children}</div>
    </div>
  );
}
