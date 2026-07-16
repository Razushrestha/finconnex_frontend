// "use client";

// import { CallsFilterPanel } from "@/components/activities/calls/CallsFilterPanel";
// import { CallsKanbanBoard } from "@/components/activities/calls/CallsKanbanBoard";
// import { CallsListTable } from "@/components/activities/calls/CallsListTable";
// import {
//   CallsToolbar,
//   CallView,
// } from "@/components/activities/calls/CallsToolbar";
// import { useState } from "react";

// export default function CallsPage() {
//   const [view, setView] = useState<CallView>("list");
//   const [filterOpen, setFilterOpen] = useState(false);
//   const [sortActive, setSortActive] = useState(true);

//   return (
//     <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-slate-50/50 lg:p-4">
//       <div className="shrink-0">
//         <CallsToolbar
//           view={view}
//           onViewChange={setView}
//           filterOpen={filterOpen}
//           onToggleFilter={() => setFilterOpen((v) => !v)}
//           sortActive={sortActive}
//           onClearSort={() => setSortActive(false)}
//         />
//       </div>

//       <div className="flex min-h-0 flex-1 items-stretch gap-4">
//         {filterOpen && (
//           <CallsFilterPanel onClose={() => setFilterOpen(false)} />
//         )}

//         {/* Single scroll-owning wrapper — same pattern as TasksPage */}
//         <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-2xl [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
//           {view === "list" ? (
//             <CallsListTable sortActive={sortActive} />
//           ) : (
//             <CallsKanbanBoard />
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { CallsFilterPanel } from "@/components/activities/calls/CallsFilterPanel";
import { CallsKanbanBoard } from "@/components/activities/calls/CallsKanbanBoard";
import { CallsListTable } from "@/components/activities/calls/CallsListTable";
import {
  CallsToolbar,
  CallView,
} from "@/components/activities/calls/CallsToolbar";
import { useState } from "react";

export default function CallsPage() {
  const [view, setView] = useState<CallView>("list");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortActive, setSortActive] = useState(true);

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      {/* Toolbar — fixed, never scrolls */}
      <div className="shrink-0">
        <CallsToolbar
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          sortActive={sortActive}
          onClearSort={() => setSortActive(false)}
        />
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden">
        {filterOpen && (
          <CallsFilterPanel onClose={() => setFilterOpen(false)} />
        )}

        {/* Single scroll-owning wrapper — same pattern as TasksPage */}
        <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-2xl [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
          {view === "list" ? (
            <CallsListTable sortActive={sortActive} />
          ) : (
            <CallsKanbanBoard />
          )}
        </div>
      </div>
    </div>
  );
}
