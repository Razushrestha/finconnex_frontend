import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  SETTINGS_REDIRECTS,
  findSettingsPage,
} from "@/lib/settings/settings-config";
import { settingsSubnav } from "@/lib/settings/settings-nav";
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
import { CalendlyConnectionCard } from "@/components/booking/CalendlyConnectionCard";
import { CalendarSyncSettingsClient } from "@/components/settings/CalendarSyncSettingsClient";
import { CrmPicklistSettingsClient } from "@/components/settings/CrmPicklistSettingsClient";
import { CRM_SETTINGS_PICKLISTS } from "@/lib/settings/crm-picklists";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ category: string; subpage: string }>;
  searchParams: Promise<{ type?: string | string[] }>;
}

export default async function SettingsSubPage({ params, searchParams }: PageProps) {
  const [{ category: categorySlug, subpage: subpageSlug }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  const legacy = SETTINGS_REDIRECTS[`${categorySlug}/${subpageSlug}`];
  if (legacy) {
    redirect(`/settings/${legacy.category}/${legacy.subpage}`);
  }

  const hit = findSettingsPage(categorySlug, subpageSlug);
  if (!hit) notFound();

  const { category, item } = hit;
  const path = `/settings/${category.slug}/${item.slug}`;
  const key = `${category.slug}/${item.slug}`;
  const picklist = CRM_SETTINGS_PICKLISTS[key];

  const custom =
    key === "data-management/recycle-bin" ? (
      <RecycleBinSettingsClient
        initialEntityType={Array.isArray(query.type) ? query.type[0] : query.type}
      />
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
    ) : key === "integrations/calendly" ? (
      <CalendlyConnectionCard showCalendarSync={false} />
    ) : key === "integrations/google-calendar" ? (
      <CalendarSyncSettingsClient provider="google" />
    ) : key === "integrations/outlook-calendar" ? (
      <CalendarSyncSettingsClient provider="outlook" />
    ) : picklist ? (
      <CrmPicklistSettingsClient spec={picklist} pageKey={key} />
    ) : null;

  const currentHref = path;
  const subnav = (() => {
    const links = settingsSubnav(category.slug, currentHref);
    if (!links.some((link) => link.href === currentHref)) {
      return [
        ...links,
        {
          title: item.title,
          blurb: item.blurb ?? "",
          href: currentHref,
        },
      ];
    }
    return links;
  })();

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside>
        <div className="sticky top-4 overflow-hidden rounded-3xl border border-slate-100 bg-white p-2 shadow-sm ring-1 ring-slate-100">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
            {category.title}
          </p>
          <nav className="space-y-0.5 pb-1">
            {subnav.map((navItem) => {
              const active = navItem.href === currentHref;
              return (
                <Link
                  key={navItem.href}
                  href={navItem.href}
                  className={cn(
                    "block rounded-2xl px-3 py-2 text-[12px] transition-colors",
                    active
                      ? "bg-[#5A32A3] font-semibold text-white shadow-sm shadow-[#5A32A3]/20"
                      : "font-medium text-slate-600 hover:bg-[#F4F1FA] hover:text-[#5A32A3]",
                  )}
                >
                  {navItem.title}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div>
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
