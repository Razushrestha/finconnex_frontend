"use client";

import { MessagesFilterPanel } from "@/components/activities/messages/MessagesFilterPanel";
import {
  MessagesToolbar,
  MessageView,
} from "@/components/activities/messages/MessagesToolbar";
import { useState } from "react";

export default function MessagesPage() {
  const [view, setView] = useState<MessageView>("list");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortActive, setSortActive] = useState(true);

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      {/* Toolbar — fixed, never scrolls */}
      <div className="shrink-0">
        <MessagesToolbar
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          sortActive={sortActive}
          onClearSort={() => setSortActive(false)}
        />
      </div>
      {filterOpen && (
        <MessagesFilterPanel onClose={() => setFilterOpen(false)} />
      )}
    </div>
  );
}
