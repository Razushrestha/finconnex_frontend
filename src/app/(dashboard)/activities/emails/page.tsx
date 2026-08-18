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

  return (
    <div className={BOARD_PAGE}>
      <FocusHighlight />
      <div className="shrink-0">
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
