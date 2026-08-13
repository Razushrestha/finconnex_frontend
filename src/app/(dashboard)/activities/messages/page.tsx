"use client";

import { useState } from "react";
import { MessagesFilterPanel } from "@/components/activities/messages/MessagesFilterPanel";
import { MessagesListTable } from "@/components/activities/messages/MessagesListTable";
import {
  ActivityToolbar,
  type ActivityView,
} from "@/components/activities/ActivityToolbar";
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
  activityExportMenuItem("messages"),
];

export default function MessagesPage() {
  const [view, setView] = useState<ActivityView>("kanban");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortActive, setSortActive] = useState(true);

  return (
    <div className={BOARD_PAGE}>
      <FocusHighlight />
      <div className="shrink-0">
        <ActivityToolbar
          entityLabel="Message"
          createRoute="/activities/messages/create"
          tabs={["All Messages"]}
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          onClearSort={() => setSortActive(false)}
          moreMenuItems={moreMenuItems}
          printViewItems={printViewItems}
        />
      </div>
      <div className="relative flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden">
        {/* On mobile, filter panel can act as an absolute overlay, or slide over content */}
        {filterOpen && (
          <div className="absolute inset-y-0 left-0 z-30 flex sm:relative">
            <MessagesFilterPanel onClose={() => setFilterOpen(false)} />
          </div>
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl">
          {view === "list" && <MessagesListTable />}
        </div>
      </div>
    </div>
  );
}
