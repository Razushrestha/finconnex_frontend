"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { initials } from "@/lib/activities/shared";
import { isUuid } from "@/lib/activity-timeline/auth";
import { listMentionPeople } from "@/lib/mentions/people";
import { TASK_OWNERS } from "@/lib/tasks/types";
import {
  loadAssignableOwners,
  listAssignableOwnersLocal,
  resolveAssignableOwnerName,
  type AssignableOwner,
} from "@/lib/users/assignable";
import { cn } from "@/lib/utils";
import { useTaskSectionEdit } from "./TaskEditContext";

interface Participant {
  name: string;
  role: string;
}

interface TaskSidebarParticipantsProps {
  owner?: string;
  collaborators?: string[];
}

function directoryNames(owners: AssignableOwner[]) {
  const names = new Set<string>();
  for (const person of listMentionPeople()) {
    if (person.name.trim()) names.add(person.name.trim());
  }
  for (const owner of owners) {
    if (owner.name.trim()) names.add(owner.name.trim());
  }
  for (const owner of TASK_OWNERS) names.add(owner);
  return [...names].sort((a, b) => a.localeCompare(b));
}

function personLabel(value: string, owners: AssignableOwner[]): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const byId = owners.find((row) => row.id === trimmed);
  if (byId?.name.trim()) return byId.name.trim();
  if (!isUuid(trimmed)) return trimmed;
  return resolveAssignableOwnerName(trimmed);
}

function fromProps(
  owner: string,
  collaborators: string[],
  owners: AssignableOwner[],
): Participant[] {
  const seen = new Set<string>();
  const people: Participant[] = [];
  const ownerName = personLabel(owner, owners);
  if (ownerName) {
    seen.add(ownerName.toLowerCase());
    people.push({ name: ownerName, role: "Owner" });
  }
  for (const name of collaborators) {
    const trimmed = personLabel(name, owners);
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    people.push({ name: trimmed, role: "Collaborator" });
  }
  return people;
}

export function TaskSidebarParticipants({
  owner = "Alex Sterling",
  collaborators = ["Sarah Jenkins"],
}: TaskSidebarParticipantsProps) {
  const [owners, setOwners] = useState<AssignableOwner[]>(() =>
    listAssignableOwnersLocal(),
  );
  const [people, setPeople] = useState<Participant[]>(() =>
    fromProps(owner, collaborators, listAssignableOwnersLocal()),
  );
  const [draft, setDraft] = useState<Participant[]>(people);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadAssignableOwners().then((rows) => {
      if (cancelled || !rows.length) return;
      setOwners(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPeople(fromProps(owner, collaborators, owners));
  }, [owner, collaborators, owners]);

  const editing = useTaskSectionEdit({
    start() {
      setDraft(people.map((p) => ({ ...p })));
      setSearchOpen(false);
      setQuery("");
    },
    save() {
      setPeople(
        draft
          .map((p) => ({ ...p, name: p.name.trim() }))
          .filter((p) => p.name),
      );
      setSearchOpen(false);
      setQuery("");
    },
    cancel() {
      setDraft(people.map((p) => ({ ...p })));
      setSearchOpen(false);
      setQuery("");
    },
  });

  useEffect(() => {
    if (!searchOpen) return;
    function handleClick(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [searchOpen]);

  const taken = useMemo(
    () => new Set(draft.map((p) => p.name.trim().toLowerCase()).filter(Boolean)),
    [draft],
  );

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const names = directoryNames(owners);
    return names.filter((name) => {
      if (taken.has(name.toLowerCase())) return false;
      return !needle || name.toLowerCase().includes(needle);
    });
  }, [query, taken, owners]);

  function addCollaborator(name: string) {
    const trimmed = name.trim();
    if (!trimmed || taken.has(trimmed.toLowerCase())) return;
    const names = directoryNames(owners);
    const exists = names.some(
      (person) => person.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!exists) return;
    const canonical =
      names.find((person) => person.toLowerCase() === trimmed.toLowerCase()) ??
      trimmed;
    setDraft((prev) => [...prev, { name: canonical, role: "Collaborator" }]);
    setQuery("");
    setSearchOpen(false);
  }

  function removeCollaborator(name: string) {
    setDraft((prev) =>
      prev.filter((p) => !(p.role === "Collaborator" && p.name === name)),
    );
  }

  const rows = editing ? draft : people;

  return (
    <section className="border-b border-slate-100 py-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          Participants
        </h2>
        {editing ? (
          <button
            type="button"
            onClick={() => {
              setSearchOpen((open) => !open);
              setQuery("");
            }}
            className={cn(
              "text-slate-400 hover:text-slate-700",
              searchOpen && "text-[#5A32A3]",
            )}
            aria-label="Add participant"
            aria-expanded={searchOpen}
          >
            <UserPlus className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <div className="space-y-3">
        {rows.map((person) => (
          <div
            key={`${person.role}-${person.name}`}
            className="flex items-center gap-2"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F3ECFB] text-xs font-bold text-[#5A32A3]">
              {initials(person.name || "P")}
            </span>
            <div className="min-w-0 flex-1 border-b border-slate-100 pb-2">
              <p className="text-xs font-medium text-slate-800">{person.name}</p>
              <p className="text-[10px] text-slate-400">{person.role}</p>
            </div>
            {editing && person.role === "Collaborator" ? (
              <button
                type="button"
                onClick={() => removeCollaborator(person.name)}
                className="text-slate-300 hover:text-slate-600"
                aria-label={`Remove ${person.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}

        {editing && searchOpen ? (
          <div ref={searchRef} className="relative">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F3ECFB] text-xs font-bold text-[#5A32A3]">
                {query.trim() ? initials(query) : "P"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-0 h-3 w-3 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (matches.length === 1) addCollaborator(matches[0]!);
                      }
                      if (e.key === "Escape") {
                        setSearchOpen(false);
                        setQuery("");
                      }
                    }}
                    placeholder="Search collaborators…"
                    className="w-full border-b border-[#5A32A3] bg-transparent py-0.5 pl-4 text-xs font-medium text-slate-800 outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Collaborator</p>
              </div>
            </div>
            <ul className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {matches.length > 0 ? (
                matches.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => addCollaborator(name)}
                      className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-[#F3ECFB] hover:text-[#5A32A3]"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F3ECFB] text-[10px] font-bold text-[#5A32A3]">
                        {initials(name)}
                      </span>
                      {name}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-2.5 py-2 text-xs text-slate-400">
                  {query.trim()
                    ? "No matching people. Only existing users can be added."
                    : "No collaborators available"}
                </li>
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
