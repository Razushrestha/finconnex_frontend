"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/activities/shared";
import { USER_TAB_COLORS } from "@/lib/work-queue/config";
import { listRemainingWorkQueuePeople } from "@/lib/work-queue/people";
import {
  getWorkQueueTabState,
  hydrateWorkQueueTabs,
  mergeWorkQueueTabs,
  setWorkQueueScope,
  setWorkQueueTabs,
  subscribeWorkQueueTabs,
} from "@/lib/work-queue/tab-store";
import type { WorkQueueUserTab } from "@/lib/work-queue/live";

export function WorkQueuePersonBar() {
  const [tabs, setTabs] = React.useState<WorkQueueUserTab[]>(
    () => getWorkQueueTabState().tabs,
  );
  const [scope, setScope] = React.useState(
    () => getWorkQueueTabState().scope,
  );
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [userQuery, setUserQuery] = React.useState("");
  const userSearchRef = React.useRef<HTMLDivElement>(null);
  const userSearchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    hydrateWorkQueueTabs();
    const sync = () => {
      const next = getWorkQueueTabState();
      setTabs(next.tabs);
      setScope(next.scope);
    };
    sync();
    return subscribeWorkQueueTabs(sync);
  }, []);

  const searchableUsers = React.useMemo(
    () => listRemainingWorkQueuePeople(tabs.map((tab) => tab.name)),
    [tabs],
  );

  const matchedUsers = React.useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return searchableUsers;
    return searchableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.role?.toLowerCase().includes(q) ?? false) ||
        (u.email?.toLowerCase().includes(q) ?? false),
    );
  }, [searchableUsers, userQuery]);

  React.useEffect(() => {
    if (!isAddUserOpen) return;
    window.setTimeout(() => userSearchInputRef.current?.focus(), 0);
    function onDoc(e: MouseEvent) {
      if (
        userSearchRef.current &&
        !userSearchRef.current.contains(e.target as Node)
      ) {
        setIsAddUserOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsAddUserOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [isAddUserOpen]);

  function selectSearchedUser(user: {
    id: string;
    name: string;
    role?: string;
  }) {
    const existing = tabs.find((t) => t.id === user.id || t.name === user.name);
    if (!existing) {
      const tab: WorkQueueUserTab = {
        id: user.id,
        name: user.name,
        role: user.role || "User",
        initials: initials(user.name),
        color: USER_TAB_COLORS[tabs.length % USER_TAB_COLORS.length],
      };
      setWorkQueueTabs([...tabs, tab]);
    }
    setWorkQueueScope(existing?.id ?? user.id);
    setUserQuery("");
    setIsAddUserOpen(false);
  }

  return (
    <div className="flex w-full items-end gap-0 px-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-end overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((u) => {
        const active = u.id === scope;
        return (
          <button
            key={u.id}
            type="button"
            onClick={() => setWorkQueueScope(u.id)}
            className={cn(
              "group relative flex shrink-0 items-center gap-2 px-3 py-2.5 transition-colors",
              active ? "text-slate-900" : "text-slate-500 hover:text-slate-800",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white transition-opacity",
                active ? "opacity-100" : "opacity-70 group-hover:opacity-90",
              )}
              style={{ backgroundColor: u.color || "#64748B" }}
            >
              {u.initials}
            </span>
            <span className="hidden min-w-0 flex-col leading-tight sm:flex">
              <span
                className={cn(
                  "truncate text-[13px] transition-colors",
                  active ? "font-semibold" : "font-medium",
                )}
              >
                {u.name}
              </span>
              <span className="truncate text-[11px] text-slate-400">
                {u.role}
              </span>
            </span>
            <span
              className={cn(
                "absolute inset-x-2 bottom-0 h-[2px] rounded-full transition-colors",
                active ? "bg-[#4F46E5]" : "bg-transparent",
              )}
            />
          </button>
        );
      })}
      </div>
      <div className="relative mb-1.5 ml-1 shrink-0" ref={userSearchRef}>
        <button
          type="button"
          aria-label="Search users"
          title="Search users"
          aria-expanded={isAddUserOpen}
          onClick={() => {
            setIsAddUserOpen((v) => !v);
            setUserQuery("");
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        {isAddUserOpen ? (
          <div className="absolute top-9 left-0 z-40 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                ref={userSearchInputRef}
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search users…"
                className="w-full bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {matchedUsers.length === 0 ? (
                <p className="px-3 py-3 text-center text-[12px] text-slate-400">
                  {userQuery.trim()
                    ? `No users match “${userQuery.trim()}”`
                    : "All users are already added"}
                </p>
              ) : (
                matchedUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => selectSearchedUser(u)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-violet-50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">
                      {initials(u.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-slate-800">
                        {u.name}
                      </span>
                      <span className="block truncate text-[11px] text-slate-400">
                        {u.role}
                        {u.email ? ` · ${u.email}` : ""}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function useWorkQueueScope() {
  const [scope, setScope] = React.useState(
    () => getWorkQueueTabState().scope,
  );

  React.useEffect(() => {
    hydrateWorkQueueTabs();
    const sync = () => setScope(getWorkQueueTabState().scope);
    sync();
    return subscribeWorkQueueTabs(sync);
  }, []);

  React.useEffect(() => {
    mergeWorkQueueTabs(getWorkQueueTabState().tabs);
  }, []);

  return scope;
}
