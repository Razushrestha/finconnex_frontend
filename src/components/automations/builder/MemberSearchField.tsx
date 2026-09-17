"use client";

/**
 * A searchable teammate picker, in single- and multi-select form.
 *
 * It replaces a flat checkbox list of the whole workspace: readable at five
 * teammates, unusable at fifty, with no way to find anyone by name. The
 * member list is already loaded in full by the step panel, so the search
 * filters in memory rather than round-tripping — typing stays instant.
 *
 * The saved value is always an array of user ids, single-select included,
 * because the backend keys these fields (`assigneeIds`, `collaboratorIds`)
 * as arrays. Single-select simply keeps at most one entry in it.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { WorkspaceMember } from "@/lib/workspace-members/types";

export type MembersStatus = "loading" | "ready" | "error";

const displayName = (member: WorkspaceMember) => member.name || member.email;

export function MemberSearchField({
  members,
  membersStatus,
  value,
  onChange,
  multiple,
  noun = { one: "teammate", many: "teammates" },
}: {
  members: WorkspaceMember[];
  membersStatus: MembersStatus;
  value: string[];
  onChange: (ids: string[]) => void;
  multiple: boolean;
  noun?: { one: string; many: string };
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const byId = useMemo(
    () => new Map(members.map((member) => [member.userId, member])),
    [members]
  );

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((member) =>
      `${member.name ?? ""} ${member.email ?? ""}`.toLowerCase().includes(needle)
    );
  }, [members, query]);

  /** An id with no matching member — someone removed from the workspace. */
  const labelFor = (id: string) => {
    const member = byId.get(id);
    return member ? displayName(member) : id;
  };

  function toggle(id: string) {
    if (!multiple) {
      onChange([id]);
      setOpen(false);
      setQuery("");
      return;
    }
    onChange(
      value.includes(id) ? value.filter((item) => item !== id) : [...value, id]
    );
  }

  // Single-select with a choice made reads as a field, not a search box —
  // the same shape RecordField settles into once a record is picked.
  if (!multiple && value.length > 0 && !open) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2">
        <span className="truncate text-sm text-slate-700">{labelFor(value[0])}</span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setQuery("");
              setOpen(true);
            }}
          >
            Change
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            aria-label={`Clear ${noun.one}`}
            onClick={() => onChange([])}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="space-y-2">
      {multiple && value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span
              key={id}
              className="flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-2.5 pr-1 text-xs text-slate-700"
            >
              {labelFor(id)}
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== id))}
                className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                aria-label={`Remove ${labelFor(id)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          placeholder={
            membersStatus === "loading"
              ? `Loading ${noun.many}...`
              : `Search ${noun.many}...`
          }
          className="pl-8"
        />
      </div>

      {open && (
        <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200">
          {membersStatus === "loading" && (
            <div className="flex items-center gap-2 p-3 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading {noun.many}...
            </div>
          )}
          {membersStatus === "error" && (
            <p className="p-3 text-xs text-rose-500">
              Couldn&apos;t load {noun.many}. Try closing and reopening this panel.
            </p>
          )}
          {membersStatus === "ready" && matches.length === 0 && (
            <p className="p-3 text-xs text-slate-400">
              {members.length === 0
                ? `No ${noun.many} found.`
                : `No ${noun.many} match “${query}”.`}
            </p>
          )}
          {membersStatus === "ready" &&
            matches.map((member) => {
              const selected = value.includes(member.userId);
              return (
                <button
                  key={member.userId}
                  type="button"
                  onClick={() => toggle(member.userId)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50",
                    selected && "bg-blue-50/60"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-slate-700">
                      {displayName(member)}
                    </span>
                    {member.name && member.email && (
                      <span className="block truncate text-xs text-slate-400">
                        {member.email}
                      </span>
                    )}
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
