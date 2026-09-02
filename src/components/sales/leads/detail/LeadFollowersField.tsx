"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { avatarColor, initials } from "@/lib/activities/shared";
import { OWNERS } from "@/lib/leads/types";
import { listCrmUsers } from "@/lib/settings/users-store";
import { listCrmWorkspaceMembers } from "@/lib/workspace-members/api";
import { isUuid } from "@/lib/activity-timeline/auth";
import { cn } from "@/lib/utils";

const FOLLOWERS_KEY = "followersJson";

function parseFollowers(raw?: string): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((name): name is string => typeof name === "string" && Boolean(name.trim()))
      .map((name) => name.trim());
  } catch {
    return raw
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
  }
}

function teamMemberNames(extra: string[] = []): string[] {
  const users = listCrmUsers().filter(
    (user) => user.status !== "Inactive" && user.name.trim(),
  );
  const fromUsers = users.map((user) => user.name.trim());
  const names = [...fromUsers, ...extra, ...OWNERS].filter(Boolean);
  return [...new Set(names)];
}

export function LeadFollowersField({
  value,
  owner,
  onChange,
}: {
  value?: string;
  owner?: string;
  onChange: (next: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [followers, setFollowers] = useState(() => parseFollowers(value));
  const [memberNames, setMemberNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listCrmWorkspaceMembers()
      .then((members) => {
        if (cancelled) return;
        setMemberNames(
          members
            .filter((m) => isUuid(m.userId) && m.name.trim())
            .map((m) => m.name.trim()),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const parsed = parseFollowers(value);
    setFollowers((current) => {
      if (parsed.length === 0 && current.length > 0) return current;
      if (parsed.join("\0") === current.join("\0")) return current;
      return parsed;
    });
  }, [value]);

  const candidates = useMemo(() => {
    const taken = new Set(followers.map((name) => name.toLowerCase()));
    if (owner?.trim()) taken.add(owner.trim().toLowerCase());
    const q = query.trim().toLowerCase();
    return teamMemberNames(memberNames).filter((name) => {
      if (taken.has(name.toLowerCase())) return false;
      if (!q) return true;
      return name.toLowerCase().includes(q);
    });
  }, [followers, owner, query, memberNames]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  function persist(next: string[]) {
    setFollowers(next);
    onChange(JSON.stringify(next));
  }

  function add(name: string) {
    persist([...followers, name]);
    setQuery("");
    setOpen(false);
  }

  function remove(name: string) {
    persist(followers.filter((item) => item !== name));
  }

  const nextSlot = followers.length + 1;
  const addLabel =
    nextSlot === 1
      ? "Add 1st follower"
      : nextSlot === 2
        ? "Add 2nd follower"
        : nextSlot === 3
          ? "Add 3rd follower"
          : `Add follower ${nextSlot}`;

  return (
    <div className="relative mt-0.5" ref={wrapRef}>
      <div className="flex items-center gap-1">
        {followers.map((name, index) => (
          <span key={`${name}-${index}`} className="group relative shrink-0">
            <span
              title={name}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold",
                avatarColor(name),
              )}
            >
              {initials(name)}
            </span>
            <button
              type="button"
              title={`Remove ${name}`}
              onClick={() => remove(name)}
              className="absolute -top-1 -right-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-700 text-white group-hover:flex"
            >
              <X className="h-2 w-2" strokeWidth={3} />
            </button>
          </span>
        ))}
        {candidates.length > 0 || open ? (
          <button
            type="button"
            title={addLabel}
            aria-label={addLabel}
            onClick={() => setOpen((isOpen) => !isOpen)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-[#5A32A3] hover:text-[#5A32A3]"
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} />
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-64 overflow-hidden rounded-xl bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)] ring-1 ring-black/5">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
            {addLabel}
          </p>
          <div className="px-2 pb-2">
            <label className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-50 px-2 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#5A32A3]">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search team members"
                className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400"
              />
            </label>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {candidates.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-slate-400">
                {query.trim()
                  ? "No matching team members"
                  : "Everyone is already following"}
              </p>
            ) : (
              candidates.map((name) => (
                <button
                  key={name}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    add(name);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-violet-50"
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                      avatarColor(name),
                    )}
                  >
                    {initials(name)}
                  </span>
                  <span className="truncate text-[13px] font-medium text-slate-800">
                    {name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { FOLLOWERS_KEY };
