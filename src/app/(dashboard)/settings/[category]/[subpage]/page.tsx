import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  SETTINGS_REDIRECTS,
  findSettingsPage,
} from "@/lib/settings/settings-config";
import { SettingsFormClient } from "@/components/settings/SettingsFormClient";
import { RecycleBinSettingsClient } from "@/components/settings/RecycleBinSettingsClient";
import { LeadCardSettingsClient } from "@/components/settings/LeadCardSettingsClient";
import { CustomFieldsSettingsClient } from "@/components/settings/CustomFieldsSettingsClient";
import { PipelineSlaSettingsClient } from "@/components/settings/PipelineSlaSettingsClient";
import { TwoFactorSettingsClient } from "@/components/settings/TwoFactorSettingsClient";
import { LoginHistorySettingsClient } from "@/components/settings/LoginHistorySettingsClient";
import { AuditLogsSettingsClient } from "@/components/settings/AuditLogsSettingsClient";
import { LoginSessionsSettingsClient } from "@/components/settings/LoginSessionsSettingsClient";
import { BillingSettingsClient } from "@/components/settings/BillingSettingsClient";
import { BackupRestoreSettingsClient } from "@/components/settings/BackupRestoreSettingsClient";
import { FieldPermissionsSettingsClient } from "@/components/settings/FieldPermissionsSettingsClient";
import { AutomationLogsSettingsClient } from "@/components/settings/AutomationLogsSettingsClient";
import { WorkflowRulesSettingsClient } from "@/components/settings/WorkflowRulesSettingsClient";
import { AssignmentRulesSettingsClient } from "@/components/settings/AssignmentRulesSettingsClient";
import { TicketSlaSettingsClient } from "@/components/settings/TicketSlaSettingsClient";
import { SmtpSettingsClient } from "@/components/settings/SmtpSettingsClient";
import { CapabilitiesSettingsClient } from "@/components/settings/CapabilitiesSettingsClient";
import { UsersSettingsClient } from "@/components/settings/UsersSettingsClient";
import { WorkspacesSettingsClient } from "@/components/settings/WorkspacesSettingsClient";
import { IpRestrictionsSettingsClient } from "@/components/settings/IpRestrictionsSettingsClient";
import { CustomObjectsSettingsClient } from "@/components/settings/CustomObjectsSettingsClient";
import { NotificationPreferencesClient } from "@/components/settings/NotificationPreferencesClient";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ category: string; subpage: string }>;
}

export default async function SettingsSubPage({ params }: PageProps) {
  const { category: categorySlug, subpage: subpageSlug } = await params;

  const legacy = SETTINGS_REDIRECTS[`${categorySlug}/${subpageSlug}`];
  if (legacy) {
    redirect(`/settings/${legacy.category}/${legacy.subpage}`);
  }

  const hit = findSettingsPage(categorySlug, subpageSlug);
  if (!hit) notFound();

  const { category, item } = hit;
  const path = `/settings/${category.slug}/${item.slug}`;
  const key = `${category.slug}/${item.slug}`;

  const custom =
    key === "data-management/recycle-bin" ? (
      <RecycleBinSettingsClient />
    ) : key === "crm-configuration/lead-card" ? (
      <LeadCardSettingsClient />
    ) : key === "crm-configuration/custom-fields" ? (
      <CustomFieldsSettingsClient />
    ) : key === "crm-configuration/pipelines" ? (
      <PipelineSlaSettingsClient />
    ) : key === "security/two-factor-authentication" ? (
      <TwoFactorSettingsClient />
    ) : key === "security/login-history" ? (
      <LoginHistorySettingsClient />
    ) : key === "security/audit-logs" ? (
      <AuditLogsSettingsClient />
    ) : key === "users-and-access/login-sessions" ? (
      <LoginSessionsSettingsClient />
    ) : key === "subscription-and-billing/subscription-plan" ||
      key === "subscription-and-billing/billing" ||
      key === "subscription-and-billing/invoices" ? (
      <BillingSettingsClient />
    ) : key === "data-management/backup-and-restore" ||
      key === "data-management/restore-points" ? (
      <BackupRestoreSettingsClient />
    ) : key === "users-and-access/permissions" ? (
      <FieldPermissionsSettingsClient />
    ) : key === "workflow-and-automation/workflow-builder" ? (
      <WorkflowRulesSettingsClient />
    ) : key === "workflow-and-automation/assignment-rules" ||
      key === "workflow-and-automation/round-robin" ? (
      <AssignmentRulesSettingsClient />
    ) : key === "workflow-and-automation/sla-rules" ? (
      <TicketSlaSettingsClient />
    ) : key === "workflow-and-automation/automation-logs" ? (
      <AutomationLogsSettingsClient />
    ) : key === "communication/smtp" ? (
      <SmtpSettingsClient />
    ) : key === "system/enable-disable-modules" ? (
      <CapabilitiesSettingsClient />
    ) : key === "users-and-access/users" ? (
      <UsersSettingsClient />
    ) : key === "users-and-access/workspaces" ? (
      <WorkspacesSettingsClient />
    ) : key === "security/ip-restrictions" ? (
      <IpRestrictionsSettingsClient />
    ) : key === "crm-configuration/custom-objects" ? (
      <CustomObjectsSettingsClient />
    ) : category.slug === "notifications" ? (
      <NotificationPreferencesClient
        title={item.title}
        description={category.description}
        moduleHref={item.moduleHref}
        moduleLabel={item.moduleLabel}
      />
    ) : null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
      <aside className="lg:col-span-1">
        <div className="sticky top-4 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
          <p className="mb-2 px-2 text-[9px] font-semibold tracking-wide text-slate-400 uppercase">
            {category.section} · {category.title}
          </p>
          <nav className="max-h-[70vh] space-y-0.5 overflow-y-auto">
            {category.items.map((navItem) => {
              const active = navItem.slug === item.slug;
              return (
                <Link
                  key={navItem.slug}
                  href={`/settings/${category.slug}/${navItem.slug}`}
                  className={cn(
                    "block rounded-xl px-3 py-2 text-[12px] transition-colors",
                    active
                      ? "bg-violet-600 font-semibold text-white shadow-sm shadow-violet-600/20"
                      : "font-medium text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {navItem.title}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="lg:col-span-3">
        {custom ?? (
          <SettingsFormClient
            categorySlug={category.slug}
            subpageSlug={item.slug}
            path={path}
            moduleHref={item.moduleHref}
            moduleLabel={item.moduleLabel}
          />
        )}
      </div>
    </div>
  );
}
