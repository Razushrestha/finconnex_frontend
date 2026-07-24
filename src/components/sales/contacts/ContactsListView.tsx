"use client";

import { useMemo } from "react";
import { MoreVertical } from "lucide-react";
import { CONTACT_GROUPS, type ContactGroup } from "@/lib/contacts/types";
import type { ContactFilters } from "./FilterContactsPanel";

interface ContactsListViewProps {
  groups?: ContactGroup[];
  filters?: ContactFilters;
}

export function ContactsListView({
  groups = CONTACT_GROUPS,
  filters,
}: ContactsListViewProps) {
  const allContacts = useMemo(() => {
    const hasStatusFilter = !!filters?.statuses.length;
    const hasSourceFilter = !!filters?.sources.length;

    return groups
      .filter(
        (group) =>
          !hasStatusFilter || filters!.statuses.includes(group.title),
      )
      .flatMap((group) =>
        group.contacts
          .filter(
            (c) => !hasSourceFilter || filters!.sources.includes(c.source),
          )
          .map((c) => ({
            ...c,
            statusTitle: group.title,
            statusDotColor: group.dotColorClass,
          })),
      );
  }, [groups, filters]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-[12px]">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            <tr>
              <th className="px-3 py-2.5">Contact</th>
              <th className="px-3 py-2.5">Company</th>
              <th className="px-3 py-2.5">Email</th>
              <th className="px-3 py-2.5">Phone</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Owner</th>
              <th className="px-3 py-2.5">Source</th>
              <th className="px-3 py-2.5">Created</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {allContacts.map((contact) => (
              <tr
                key={contact.id}
                data-focus-id={contact.id}
                data-contact-id={contact.id}
                className="transition-colors hover:bg-slate-50/80"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${contact.avatarBgClass}`}
                    >
                      {contact.initials}
                    </div>
                    <span className="font-semibold text-slate-900">
                      {contact.name}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {contact.company || ""}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                  {contact.email}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {contact.phone || ""}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${contact.statusDotColor}`}
                    />
                    {contact.statusTitle}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {contact.owner}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                  {contact.source}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                  {contact.createdDate}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    aria-label="More actions"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {allContacts.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-12 text-center text-sm text-slate-400"
                >
                  No contacts match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
        Showing {allContacts.length} contacts
      </div>
    </div>
  );
}
