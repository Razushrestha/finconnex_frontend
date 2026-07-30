"use client";

import { useMemo, useState } from "react";
import { MoreVertical } from "lucide-react";
import { CONTACT_GROUPS, type ContactGroup } from "@/lib/contacts/types";
import type { ContactFilters } from "./FilterContactsPanel";
import { cn } from "@/lib/utils";
import { TableDisplayOptionsMenu } from "@/components/common/TableDisplayOptionsMenu";
import {
  ManageColumnsModal,
  type ManageColumn,
} from "@/components/work-queue/ManageColumnsModal";
import Link from "next/link";

interface ContactsListViewProps {
  groups?: ContactGroup[];
  filters?: ContactFilters;
  sortValue?: string; // Added sortValue prop
}

const DEFAULT_CONTACT_COLUMNS: ManageColumn[] = [
  { id: "contact", label: "Contact", checked: true, required: true },
  { id: "company", label: "Company", checked: true },
  { id: "email", label: "Email", checked: true },
  { id: "phone", label: "Phone", checked: true },
  { id: "status", label: "Status", checked: true },
  { id: "owner", label: "Owner", checked: true },
  { id: "source", label: "Source", checked: true },
  { id: "created", label: "Created", checked: true },
  { id: "actions", label: "Actions", checked: true },
];

type ContactRow = ReturnType<typeof buildAllContactsShape>;

function buildAllContactsShape(groups: ContactGroup[]) {
  return groups.flatMap((group) =>
    group.contacts.map((c) => ({
      ...c,
      statusTitle: group.title,
      statusDotColor: group.dotColorClass,
    })),
  )[0];
}

interface ColumnRenderer {
  th: React.ReactNode;
  thClassName?: string;
  td: (contact: ContactRow) => React.ReactNode;
  tdClassName?: string;
}

const columnRenderers: Record<string, ColumnRenderer> = {
  contact: {
    th: "Contact",
    tdClassName: "px-3 py-2 whitespace-nowrap",
    td: (contact) => (
      <Link
        href={`/sales/contacts/detail/${contact.id}`}
        className="group flex items-center gap-2.5"
      >
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${contact.avatarBgClass}`}
        >
          {contact.initials}
        </div>
        <span className="font-semibold text-slate-900 group-hover:text-indigo-600 group-hover:underline">
          {contact.name}
        </span>
      </Link>
    ),
  },
  company: {
    th: "Company",
    tdClassName: "px-3 py-2 whitespace-nowrap text-slate-600",
    td: (contact) => contact.company || "",
  },
  email: {
    th: "Email",
    tdClassName: "px-3 py-2 whitespace-nowrap text-slate-500",
    td: (contact) => contact.email,
  },
  phone: {
    th: "Phone",
    tdClassName: "px-3 py-2 whitespace-nowrap text-slate-600",
    td: (contact) => contact.phone || "",
  },
  status: {
    th: "Status",
    tdClassName: "px-3 py-2 whitespace-nowrap",
    td: (contact) => (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
        <span
          className={`h-1.5 w-1.5 rounded-full ${contact.statusDotColor}`}
        />
        {contact.statusTitle}
      </span>
    ),
  },
  owner: {
    th: "Owner",
    tdClassName: "px-3 py-2 whitespace-nowrap text-slate-600",
    td: (contact) => contact.owner,
  },
  source: {
    th: "Source",
    tdClassName: "px-3 py-2 whitespace-nowrap text-slate-500",
    td: (contact) => contact.source,
  },
  created: {
    th: "Created",
    tdClassName: "px-3 py-2 whitespace-nowrap text-slate-500",
    td: (contact) => contact.createdDate,
  },
  actions: {
    th: "Actions",
    thClassName: "px-3 py-2.5 text-right",
    tdClassName: "px-3 py-2 text-right",
    td: () => (
      <button
        type="button"
        aria-label="More actions"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
    ),
  },
};

export function ContactsListView({
  groups = CONTACT_GROUPS,
  filters,
  sortValue = "newest",
}: ContactsListViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(10);
  const [manageColumnsOpen, setManageColumnsOpen] = useState(false);
  const [manageColumns, setManageColumns] = useState<ManageColumn[]>(
    DEFAULT_CONTACT_COLUMNS,
  );

  const allContacts = useMemo(() => {
    const hasStatusFilter = !!filters?.statuses.length;
    const hasSourceFilter = !!filters?.sources.length;

    const filtered = groups
      .filter(
        (group) => !hasStatusFilter || filters!.statuses.includes(group.title),
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

    return filtered.sort((a, b) => {
      if (sortValue === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortValue === "name_desc") {
        return b.name.localeCompare(a.name);
      }

      // Helper to convert "DD/MM/YYYY" to timestamp
      const parseDate = (dateStr: string) => {
        const [day, month, year] = dateStr.split("/").map(Number);
        return new Date(year, month - 1, day).getTime();
      };

      const timeA = parseDate(a.createdDate);
      const timeB = parseDate(b.createdDate);

      if (sortValue === "oldest") {
        return timeA - timeB;
      }
      // Default: "newest"
      return timeB - timeA;
    });
  }, [groups, filters, sortValue]);

  const pagedContacts = useMemo(
    () => allContacts.slice(0, pageSize),
    [allContacts, pageSize],
  );

  const allSelected =
    pagedContacts.length > 0 &&
    pagedContacts.every((c) => selectedIds.has(c.id));
  const someSelected =
    pagedContacts.some((c) => selectedIds.has(c.id)) && !allSelected;

  const orderedVisibleColumns = useMemo(
    () => manageColumns.filter((c) => c.checked),
    [manageColumns],
  );

  function toggleAll() {
    setSelectedIds((prev) => {
      if (allSelected) return new Set();
      return new Set([...prev, ...pagedContacts.map((c) => c.id)]);
    });
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-[12px]">
          <thead className="border-b border-slate-100 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            <tr className="sticky top-0 z-10 bg-slate-50/80">
              <th className="w-8 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all contacts"
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
              </th>

              {orderedVisibleColumns.map((col) => (
                <th
                  key={col.id}
                  className={
                    columnRenderers[col.id]?.thClassName ?? "px-3 py-2.5"
                  }
                >
                  {columnRenderers[col.id]?.th}
                </th>
              ))}

              <th
                className={cn(
                  "sticky right-0 z-20 -mr-3 bg-slate-50/80 pr-3 pl-3 text-right",
                  "shadow-[-12px_0_12px_-8px_rgba(15,23,42,0.06)]",
                )}
              >
                <TableDisplayOptionsMenu
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  onManageColumns={() => setManageColumnsOpen(true)}
                  className="flex justify-end"
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {pagedContacts.map((contact) => (
              <tr
                key={contact.id}
                data-focus-id={contact.id}
                data-contact-id={contact.id}
                className="transition-colors hover:bg-slate-50/80"
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(contact.id)}
                    onChange={() => toggleOne(contact.id)}
                    aria-label={`Select ${contact.name}`}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                </td>

                {orderedVisibleColumns.map((col) => (
                  <td
                    key={col.id}
                    className={
                      columnRenderers[col.id]?.tdClassName ?? "px-3 py-2"
                    }
                  >
                    {columnRenderers[col.id]?.td(contact)}
                  </td>
                ))}

                <td className="px-3 py-2" />
              </tr>
            ))}
            {pagedContacts.length === 0 && (
              <tr>
                <td
                  colSpan={orderedVisibleColumns.length + 2}
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
        Showing {pagedContacts.length} of {allContacts.length} contacts
      </div>

      <ManageColumnsModal
        open={manageColumnsOpen}
        columns={manageColumns}
        onClose={() => setManageColumnsOpen(false)}
        onSave={(cols) => {
          setManageColumns(cols);
          setManageColumnsOpen(false);
        }}
      />
    </div>
  );
}
