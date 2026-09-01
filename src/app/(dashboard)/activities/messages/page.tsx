"use client";

import { useEffect, useState } from "react";
import { MessagesFilterPanel } from "@/components/activities/messages/MessagesFilterPanel";
import { MessagesListTable } from "@/components/activities/messages/MessagesListTable";
import { MessagesTimelineView } from "@/components/activities/messages/MessagesTimelineView";
import {
  ActivityToolbar,
  TIMELINE_VIEW_TOGGLE,
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
import { listMessages } from "@/lib/messages/store";
import { useCrmMessages } from "@/lib/messages/use-crm-messages";
import type { Message } from "@/lib/messages/types";
import { cn } from "@/lib/utils";

const moreMenuItems = [
  { key: "mass-transfer", icon: ArrowRightLeft, label: "Mass Transfer" },
  { key: "mass-delete", icon: Trash2, label: "Mass Delete" },
  { key: "mass-update", icon: RefreshCw, label: "Mass Update" },
  { key: "manage-tags", icon: Tags, label: "Manage Tags" },
  { key: "assignment-rules", icon: ShieldCheck, label: "Assignment Rules" },
  activityExportMenuItem("messages"),
];

export default function MessagesPage() {
  const [view, setView] = useState<ActivityView>("list");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortActive, setSortActive] = useState(true);
  const [rows, setRows] = useState<Message[]>([]);
  const crm = useCrmMessages();

  useEffect(() => {
    if (crm.loading) return;
    setRows(listMessages());
  }, [crm.source, crm.loading]);

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
          entityLabel="Message"
          createRoute="/activities/messages/create"
          tabs={["All Messages"]}
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          onClearSort={() => setSortActive(false)}
          extraViewIcons={[TIMELINE_VIEW_TOGGLE]}
          moreMenuItems={moreMenuItems}
          printViewItems={printViewItems}
        />
      </div>
      <div className="relative flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden">
        {filterOpen && (
          <div className="absolute inset-y-0 left-0 z-30 flex sm:relative">
            <MessagesFilterPanel onClose={() => setFilterOpen(false)} />
          </div>
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl">
          {view === "timeline" ? (
            <MessagesTimelineView />
          ) : (
            <MessagesListTable data={crm.loading ? undefined : rows} />
          )}
        </div>
      </div>
    </div>
  );
}
