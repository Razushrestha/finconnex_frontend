"use client";

import { useState } from "react";
import { EmailListTable } from "@/components/activities/emails/EmailListTable";
import { ActivityToolbar } from "@/components/activities/ActivityToolbar";
import { EmailsFilterPanel } from "@/components/activities/emails/EmailsFilterPanel";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { printViewItems } from "../tasks/page";
import {
  ArrowRightLeft,
  Trash2,
  RefreshCw,
  Tags,
  ShieldCheck,
} from "lucide-react";
import { activityExportMenuItem } from "@/lib/activities/export";
import { BOARD_PAGE } from "@/lib/layout";
import { useCrmEmails } from "@/lib/emails/use-crm-emails";
import { cn } from "@/lib/utils";

const moreMenuItems = [
  { key: "mass-transfer", icon: ArrowRightLeft, label: "Mass Transfer" },
  { key: "mass-delete", icon: Trash2, label: "Mass Delete" },
  { key: "mass-update", icon: RefreshCw, label: "Mass Update" },
  { key: "manage-tags", icon: Tags, label: "Manage Tags" },
  { key: "assignment-rules", icon: ShieldCheck, label: "Assignment Rules" },
  activityExportMenuItem("emails"),
];

export default function EmailsPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const crm = useCrmEmails();

  return (
    <div className={BOARD_PAGE}>
      <FocusHighlight />
      <div className="shrink-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              crm.source === "api"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500",
            )}
          >
            {crm.source === "api"
              ? "Live CRM"
              : crm.loading
                ? "Connecting…"
                : "Demo"}
          </span>
          {crm.error && crm.source === "demo" ? (
            <span className="text-[10px] text-slate-500">{crm.error}</span>
          ) : null}
        </div>
        <ActivityToolbar
          entityLabel="Email"
          createRoute="/activities/emails/create"
          tabs={["All Emails"]}
          view="list"
          onViewChange={() => {}}
          showViewSwitcher={false}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          moreMenuItems={moreMenuItems}
          printViewItems={printViewItems}
        />
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden">
        {filterOpen && (
          <EmailsFilterPanel onClose={() => setFilterOpen(false)} />
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <EmailListTable />
        </div>
      </div>
    </div>
  );
}
