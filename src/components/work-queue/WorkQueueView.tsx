"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  Download,
  Home,
  LayoutGrid,
  Plus,
  RefreshCw,
} from "lucide-react";
import { WorkQueueSidebar } from "@/components/work-queue/WorkQueueSidebar";
import { WorkQueueTable } from "@/components/work-queue/WorkQueueTable";
import { WorkQueueMeetingsTable } from "@/components/work-queue/WorkQueueMeetingsTable";
import { WorkQueueCallsTable } from "@/components/work-queue/WorkQueueCallsTable";
import { WorkQueueLeadsTable } from "@/components/work-queue/WorkQueueLeadsTable";
import {
  getActivityTitle,
  getCallsForPerson,
  getLeadsForPerson,
  getMeetingsForPerson,
  getTasksForPerson,
  WORK_QUEUE_PEOPLE,
} from "@/lib/work-queue/data";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 6;

function isLeadsNav(nav: string) {
  return nav === "my-leads" || nav === "leads-3hrs" || nav === "pendings";
}

export function WorkQueueView() {
  const [activePerson, setActivePerson] = React.useState(
    WORK_QUEUE_PEOPLE[0]?.id ?? "shiva",
  );
  const [activeNav, setActiveNav] = React.useState("tasks");
  const [page, setPage] = React.useState(1);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const activePersonMeta = WORK_QUEUE_PEOPLE.find((p) => p.id === activePerson);
  const title = getActivityTitle(activeNav);
  const isMeetings = activeNav === "meetings";
  const isCalls = activeNav === "calls";
  const isLeads = isLeadsNav(activeNav);

  const filteredTasks = React.useMemo(
    () => getTasksForPerson(activePerson),
    [activePerson],
  );
  const filteredMeetings = React.useMemo(
    () => getMeetingsForPerson(activePerson),
    [activePerson],
  );
  const filteredCalls = React.useMemo(
    () => getCallsForPerson(activePerson),
    [activePerson],
  );
  const filteredLeads = React.useMemo(
    () => getLeadsForPerson(activePerson),
    [activePerson],
  );

  const total = isLeads
    ? filteredLeads.length
    : isCalls
      ? filteredCalls.length
      : isMeetings
        ? filteredMeetings.length
        : filteredTasks.length;

  const pageTasks = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTasks.slice(start, start + PAGE_SIZE);
  }, [filteredTasks, page]);
  const pageMeetings = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMeetings.slice(start, start + PAGE_SIZE);
  }, [filteredMeetings, page]);
  const pageCalls = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCalls.slice(start, start + PAGE_SIZE);
  }, [filteredCalls, page]);
  const pageLeads = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredLeads.slice(start, start + PAGE_SIZE);
  }, [filteredLeads, page]);

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col gap-3 bg-slate-50/50 p-3 sm:p-5 lg:p-6">
      <nav className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-slate-600"
        >
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>
        <span>&gt;</span>
        <span className="text-slate-600">Work Queue</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {title}
            </h1>
            <button
              type="button"
              aria-label={`Refresh ${title.toLowerCase()}`}
              className="rounded-full p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-0.5">
            {WORK_QUEUE_PEOPLE.map((person) => {
              const active = person.id === activePerson;
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => {
                    setActivePerson(person.id);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-none border-b-2 px-2.5 py-1.5 text-[12px] transition-colors",
                    active
                      ? "border-violet-600 font-semibold text-violet-600"
                      : "border-transparent text-slate-500 hover:text-slate-800",
                  )}
                >
                  {person.name}
                </button>
              );
            })}
            <button
              type="button"
              aria-label="Add person filter"
              className="ml-0.5 rounded-full p-1 text-slate-400 hover:bg-white hover:text-slate-600"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Export
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>
          <button
            type="button"
            aria-label="Toggle layout panel"
            onClick={() => setSidebarOpen((v) => !v)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:items-stretch">
        {sidebarOpen ? (
          <WorkQueueSidebar
            activeItem={activeNav}
            onActiveItemChange={(id) => {
              setActiveNav(id);
              setPage(1);
            }}
            onClose={() => setSidebarOpen(false)}
          />
        ) : null}

        {isLeads ? (
          <WorkQueueLeadsTable
            key={`leads-${activePerson}-${activeNav}`}
            leads={pageLeads}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
            personName={activePersonMeta?.name}
          />
        ) : isCalls ? (
          <WorkQueueCallsTable
            key={`calls-${activePerson}`}
            calls={pageCalls}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
            personName={activePersonMeta?.name}
          />
        ) : isMeetings ? (
          <WorkQueueMeetingsTable
            key={`meetings-${activePerson}`}
            meetings={pageMeetings}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
            personName={activePersonMeta?.name}
          />
        ) : (
          <WorkQueueTable
            key={`tasks-${activePerson}`}
            tasks={pageTasks}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
            personName={activePersonMeta?.name}
          />
        )}
      </div>
    </div>
  );
}
