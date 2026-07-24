// "use client";

// import * as React from "react";
// import { cn } from "@/lib/utils";
// import { Button } from "@/components/ui/button";
// import {
//   Search,
//   Plus,
//   ArrowUpDown,
//   ChevronsLeft,
//   ChevronLeft,
//   ChevronRight,
//   ChevronsRight,
// } from "lucide-react";

// type Customer = {
//   id: string;
//   name: string;
//   phone: string;
//   email: string;
//   days: string;
//   avatarUrl: string;
//   status: "Active" | "Pending";
// };

// const customers: Customer[] = [
//   {
//     id: "1",
//     name: "William Johnson",
//     phone: "+1 555 123 4567",
//     email: "johndoe1@example.com",
//     days: "2 Days",
//     avatarUrl: "https://i.pravatar.cc/64?img=12",
//     status: "Active",
//   },
//   {
//     id: "2",
//     name: "Benjamin Martinez",
//     phone: "+91 98765 43210",
//     email: "janedoe2@example.com",
//     days: "1st Half Day",
//     avatarUrl: "https://i.pravatar.cc/64?img=13",
//     status: "Active",
//   },
//   {
//     id: "3",
//     name: "Alexander Brown",
//     phone: "+44 7700 900123",
//     email: "testuser3@example.com",
//     days: "4 Days",
//     avatarUrl: "https://i.pravatar.cc/64?img=14",
//     status: "Active",
//   },
//   {
//     id: "4",
//     name: "Michael Davis",
//     phone: "+61 412 345 678",
//     email: "randomuser4@example.com",
//     days: "2nd Half Day",
//     avatarUrl: "https://i.pravatar.cc/64?img=15",
//     status: "Active",
//   },
//   {
//     id: "5",
//     name: "David Wilson",
//     phone: "+81 90 1234 5678",
//     email: "demoaccount5@example.com",
//     days: "1 Days",
//     avatarUrl: "https://i.pravatar.cc/64?img=16",
//     status: "Active",
//   },
//   {
//     id: "6",
//     name: "Benjamin Martinez",
//     phone: "+971 50 123 4567",
//     email: "samplemail6@example.com",
//     days: "1 Days",
//     avatarUrl: "https://i.pravatar.cc/64?img=17",
//     status: "Active",
//   },
// ];

// const columns = [
//   { key: "name", label: "Name" },
//   { key: "phone", label: "Phone" },
//   { key: "email", label: "Email" },
//   { key: "days", label: "Days" },
//   { key: "status", label: "Status" },
// ] as const;

// export function NewCustomersTable() {
//   const [query, setQuery] = React.useState("");
//   const [selected, setSelected] = React.useState<Set<string>>(new Set());
//   const [page, setPage] = React.useState(1);

//   const filtered = customers.filter((c) =>
//     c.name.toLowerCase().includes(query.toLowerCase()),
//   );

//   const allSelected = selected.size > 0 && selected.size === filtered.length;

//   const toggleAll = () => {
//     setSelected(allSelected ? new Set() : new Set(filtered.map((c) => c.id)));
//   };

//   const toggleRow = (id: string) => {
//     setSelected((prev) => {
//       const next = new Set(prev);
//       next.has(id) ? next.delete(id) : next.add(id);
//       return next;
//     });
//   };

//   return (
//     <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5">
//       {/* Header */}
//       <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
//         <h3 className="text-[17px] font-semibold text-gray-900">
//           New Customers
//         </h3>
//         <div className="flex items-center gap-3">
//           <div className="flex h-10 w-56 items-center gap-2 rounded-lg border border-gray-200 px-3">
//             <Search className="h-4 w-4 shrink-0 text-gray-400" />
//             <input
//               value={query}
//               onChange={(e) => setQuery(e.target.value)}
//               placeholder="Search"
//               className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
//             />
//           </div>
//           <Button
//             className="gap-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200"
//             size="sm"
//           >
//             <Plus className="h-4 w-4" />
//             Add New
//           </Button>
//         </div>
//       </div>

//       {/* Table */}
//       <div className="overflow-x-auto">
//         <table className="w-full min-w-[640px] border-collapse text-left text-sm">
//           <thead>
//             <tr className="bg-gray-50 text-gray-500">
//               <th className="w-10 rounded-l-lg py-3 pl-4">
//                 <Checkbox checked={allSelected} onClick={toggleAll} />
//               </th>
//               {columns.map((col, i) => (
//                 <th
//                   key={col.key}
//                   className={cn(
//                     "py-3 pr-4 font-semibold text-gray-700",
//                     i === columns.length - 1 && "rounded-r-lg",
//                   )}
//                 >
//                   <span className="flex items-center gap-1">
//                     {col.label}
//                     <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
//                   </span>
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {filtered.map((c) => (
//               <tr
//                 key={c.id}
//                 className="border-b border-gray-100 last:border-none"
//               >
//                 <td className="py-3 pl-4">
//                   <Checkbox
//                     checked={selected.has(c.id)}
//                     onClick={() => toggleRow(c.id)}
//                   />
//                 </td>
//                 <td className="py-3 pr-4">
//                   <div className="flex items-center gap-3">
//                     <img
//                       src={c.avatarUrl}
//                       alt={c.name}
//                       className="h-9 w-9 rounded-full object-cover"
//                     />
//                     <span className="font-medium text-gray-900">{c.name}</span>
//                   </div>
//                 </td>
//                 <td className="py-3 pr-4 text-gray-600">{c.phone}</td>
//                 <td className="py-3 pr-4 text-gray-600">{c.email}</td>
//                 <td className="py-3 pr-4 text-gray-600">{c.days}</td>
//                 <td className="py-3 pr-4 text-gray-600">{c.status}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Footer */}
//       <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
//         <span className="text-sm text-gray-500">
//           Showing 1 to 6 of 12 entries
//         </span>
//         <div className="flex items-center gap-1.5">
//           <PageIconButton aria-label="First page" onClick={() => setPage(1)}>
//             <ChevronsLeft className="h-4 w-4" />
//           </PageIconButton>
//           <PageIconButton
//             aria-label="Previous page"
//             onClick={() => setPage((p) => Math.max(1, p - 1))}
//           >
//             <ChevronLeft className="h-4 w-4" />
//           </PageIconButton>
//           <PageIconButton active={page === 1} onClick={() => setPage(1)}>
//             1
//           </PageIconButton>
//           <PageIconButton active={page === 2} onClick={() => setPage(2)}>
//             2
//           </PageIconButton>
//           <PageIconButton
//             aria-label="Next page"
//             onClick={() => setPage((p) => Math.min(2, p + 1))}
//           >
//             <ChevronRight className="h-4 w-4" />
//           </PageIconButton>
//           <PageIconButton aria-label="Last page" onClick={() => setPage(2)}>
//             <ChevronsRight className="h-4 w-4" />
//           </PageIconButton>
//         </div>
//       </div>
//     </div>
//   );
// }

// function Checkbox({
//   checked,
//   onClick,
// }: {
//   checked: boolean;
//   onClick: () => void;
// }) {
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       aria-pressed={checked}
//       className={cn(
//         "flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors",
//         checked
//           ? "border-violet-600 bg-violet-600"
//           : "border-gray-300 bg-white",
//       )}
//     >
//       {checked && (
//         <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none">
//           <path
//             d="M2.5 6.5 5 9l4.5-5.5"
//             stroke="currentColor"
//             strokeWidth="1.6"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//           />
//         </svg>
//       )}
//     </button>
//   );
// }

// function PageIconButton({
//   children,
//   active,
//   ...props
// }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
//   return (
//     <button
//       type="button"
//       className={cn(
//         "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
//         active
//           ? "border-violet-600 bg-violet-600 text-white"
//           : "border-gray-200 text-gray-500 hover:bg-gray-50",
//       )}
//       {...props}
//     >
//       {children}
//     </button>
//   );
// }

// export default NewCustomersTable;

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Search,
  Plus,
  ArrowUpDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  MoreHorizontal,
} from "lucide-react";

/**
 * New Customers table
 * Next.js 16 (App Router) + Tailwind CSS v4 + shadcn/ui
 *
 * Uses shadcn's <Button /> (npx shadcn@latest add button).
 * Self-contained: pagination/search/selection are local UI state only;
 * wire `onPageChange` / `query` up to real data fetching as needed.
 */

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  days: string;
  status: "Active" | "Pending";
  avatarUrl: string;
};

const customers: Customer[] = [
  {
    id: "1",
    name: "William Johnson",
    phone: "+1 555 123 4567",
    email: "johndoe1@example.com",
    days: "2 Days",
    status: "Active",
    avatarUrl: "https://i.pravatar.cc/64?img=12",
  },
  {
    id: "2",
    name: "Benjamin Martinez",
    phone: "+91 98765 43210",
    email: "janedoe2@example.com",
    days: "1st Half Day",
    status: "Active",
    avatarUrl: "https://i.pravatar.cc/64?img=13",
  },
  {
    id: "3",
    name: "Alexander Brown",
    phone: "+44 7700 900123",
    email: "testuser3@example.com",
    days: "4 Days",
    status: "Pending",
    avatarUrl: "https://i.pravatar.cc/64?img=14",
  },
  {
    id: "4",
    name: "Michael Davis",
    phone: "+61 412 345 678",
    email: "randomuser4@example.com",
    days: "2nd Half Day",
    status: "Active",
    avatarUrl: "https://i.pravatar.cc/64?img=15",
  },
  {
    id: "5",
    name: "David Wilson",
    phone: "+81 90 1234 5678",
    email: "demoaccount5@example.com",
    days: "1 Days",
    status: "Pending",
    avatarUrl: "https://i.pravatar.cc/64?img=16",
  },
  {
    id: "6",
    name: "Benjamin Martinez",
    phone: "+971 50 123 4567",
    email: "samplemail6@example.com",
    days: "1 Days",
    status: "Pending",
    avatarUrl: "https://i.pravatar.cc/64?img=17",
  },
];

const columns = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "days", label: "Days" },
] as const;

const statusStyles: Record<Customer["status"], string> = {
  Active: "bg-violet-50 text-violet-700",
  Pending: "bg-emerald-50 text-emerald-600",
};

export function NewCustomersTable() {
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(1);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );

  const allSelected = selected.size > 0 && selected.size === filtered.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(filtered.map((c) => c.id)));
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-gray-100 bg-white p-5">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[17px] font-semibold text-gray-900">
          New Customers
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-56 items-center gap-2 rounded-lg border border-gray-200 px-3">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
          <Button
            className="gap-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        </div>
      </div>

      <div className="w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500">
              <th className="w-10 rounded-l-lg py-3 pl-4">
                <Checkbox checked={allSelected} onClick={toggleAll} />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="py-3 pr-4 font-semibold text-gray-700"
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  </span>
                </th>
              ))}
              <th className="py-3 pr-4 font-semibold text-gray-700">
                <span className="flex items-center gap-1">
                  Status
                  <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                </span>
              </th>
              <th className="rounded-r-lg py-3 pr-4 font-semibold text-gray-700">
                <span className="flex items-center gap-1">
                  Action
                  <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="border-b border-gray-100 last:border-none"
              >
                <td className="py-1 pl-4">
                  <Checkbox
                    checked={selected.has(c.id)}
                    onClick={() => toggleRow(c.id)}
                  />
                </td>
                <td className="py-1 pr-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={c.avatarUrl}
                      alt={c.name}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <span className="font-medium text-gray-900">{c.name}</span>
                  </div>
                </td>
                <td className="py-1 pr-4 text-gray-600">{c.phone}</td>
                <td className="py-1 pr-4 text-gray-600">{c.email}</td>
                <td className="py-1 pr-4 text-gray-600">{c.days}</td>
                <td className="py-1 pr-4">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold",
                      statusStyles[c.status],
                    )}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="py-1 pr-4">
                  <button
                    type="button"
                    aria-label="Row actions"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-violet-600 hover:bg-violet-50"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2">
        <span className="text-sm text-gray-500">
          Showing 1 to 6 of 12 entries
        </span>
        <div className="flex items-center gap-1.5">
          <PageIconButton aria-label="First page" onClick={() => setPage(1)}>
            <ChevronsLeft className="h-4 w-4" />
          </PageIconButton>
          <PageIconButton
            aria-label="Previous page"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </PageIconButton>
          <PageIconButton active={page === 1} onClick={() => setPage(1)}>
            1
          </PageIconButton>
          <PageIconButton active={page === 2} onClick={() => setPage(2)}>
            2
          </PageIconButton>
          <PageIconButton
            aria-label="Next page"
            onClick={() => setPage((p) => Math.min(2, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </PageIconButton>
          <PageIconButton aria-label="Last page" onClick={() => setPage(2)}>
            <ChevronsRight className="h-4 w-4" />
          </PageIconButton>
        </div>
      </div>
    </div>
  );
}

function Checkbox({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={cn(
        "flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors",
        checked
          ? "border-violet-600 bg-violet-600"
          : "border-gray-300 bg-white",
      )}
    >
      {checked && (
        <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none">
          <path
            d="M2.5 6.5 5 9l4.5-5.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function PageIconButton({
  children,
  active,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
        active
          ? "border-violet-600 bg-violet-600 text-white"
          : "border-gray-200 text-gray-500 hover:bg-gray-50",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default NewCustomersTable;
