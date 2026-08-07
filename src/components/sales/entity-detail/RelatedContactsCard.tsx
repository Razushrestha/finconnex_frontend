"use client";

import Image from "next/image";
import { Users } from "lucide-react";
import type { RelatedContactsCardProps } from "./types";
import { Panel } from "./shared";

/**
 * List of people tied to this record. On the Lead page these are "Other
 * Contacts" at the same company; on a Deal page the same component lists
 * deal stakeholders (buyer, decision maker, etc).
 */
export function RelatedContactsCard({
  title = "Other Contacts",
  contacts,
  totalCount,
  onViewAll,
}: RelatedContactsCardProps) {
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Users className="h-4 w-4 text-muted-foreground/40" />
      </div>

      <div className="mt-3 space-y-3">
        {contacts.map((contact) => (
          <div key={contact.id} className="flex items-center gap-2.5">
            {contact.avatarUrl ? (
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border">
                <Image
                  src={contact.avatarUrl}
                  alt={contact.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-medium text-muted-foreground">
                {contact.initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {contact.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {contact.role}
              </p>
            </div>
          </div>
        ))}
      </div>

      {onViewAll && (
        <button
          onClick={onViewAll}
          className="mt-3 text-sm font-medium text-primary hover:underline transition-colors"
        >
          View All ({totalCount})
        </button>
      )}
    </Panel>
  );
}
