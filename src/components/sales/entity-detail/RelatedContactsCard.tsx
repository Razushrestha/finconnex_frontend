"use client";

import Image from "next/image";
import { Users } from "lucide-react";
import type { RelatedContactsCardProps } from "./types";
import { Panel, PanelTitle } from "./shared";

export function RelatedContactsCard({
  title = "Other Contacts",
  contacts,
  totalCount,
  onViewAll,
}: RelatedContactsCardProps) {
  return (
    <Panel>
      <PanelTitle
        action={<Users className="h-3.5 w-3.5 text-slate-300" aria-hidden />}
      >
        {title}
      </PanelTitle>

      {contacts.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-slate-400">
          No related contacts yet.
        </p>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center gap-2.5 rounded-xl border border-transparent px-1 py-0.5 transition-colors hover:border-slate-100 hover:bg-slate-50"
            >
              {contact.avatarUrl ? (
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-200">
                  <Image
                    src={contact.avatarUrl}
                    alt={contact.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[10px] font-semibold text-violet-700">
                  {contact.initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-slate-900">
                  {contact.name}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {contact.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {onViewAll && totalCount > 0 && (
        <button
          type="button"
          onClick={onViewAll}
          className="mt-3 text-[12px] font-semibold text-violet-700 transition-colors hover:text-violet-800 hover:underline"
        >
          View all ({totalCount})
        </button>
      )}
    </Panel>
  );
}
