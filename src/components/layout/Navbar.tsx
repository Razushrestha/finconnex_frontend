// "use client";

// import * as React from "react";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Badge } from "@/components/ui/badge";
// import {
//   ChevronsLeft,
//   Search,
//   Sun,
//   Moon,
//   MessageSquare,
//   Bell,
//   Calendar,
//   ChevronDown,
// } from "lucide-react";
// import { cn } from "@/lib/utils";

// interface NavbarProps {
//   onToggleSidebar?: () => void;
//   collapsed?: boolean;
//   newLeadsCount?: number;
//   user?: { name: string; role: string; avatarUrl?: string };
// }

// export function Navbar({
//   onToggleSidebar,
//   collapsed = false,
//   newLeadsCount = 27,
//   user = { name: "John smith", role: "Manager" },
// }: NavbarProps) {
//   const [theme, setTheme] = React.useState<"light" | "dark">("light");

//   return (
//     <header className="flex h-16 w-full items-center gap-4 bg-white px-4">
//       <button
//         type="button"
//         onClick={onToggleSidebar}
//         aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
//         className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
//       >
//         <ChevronsLeft
//           className={cn(
//             "h-4 w-4 transition-transform",
//             collapsed && "rotate-180",
//           )}
//         />
//       </button>

//       {/* Search */}
//       <div className="flex h-10 max-w-xs flex-1 items-center gap-2 rounded-full bg-gray-100 px-4">
//         <Search className="h-4 w-4 shrink-0 text-gray-400" />
//         <input
//           type="text"
//           placeholder="Search anything's"
//           className="w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
//         />
//       </div>

//       {/* Today new leads */}
//       <div className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-gray-200 px-4">
//         <span className="text-sm font-medium text-gray-800">
//           Today New Leads
//         </span>
//         <Badge className="rounded-full bg-violet-100 px-2 py-0 text-xs font-semibold text-violet-600 hover:bg-violet-100">
//           {newLeadsCount}
//         </Badge>
//       </div>

//       <div className="flex-1" />

//       {/* Light / dark toggle */}
//       <div className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-gray-100 p-1">
//         <button
//           type="button"
//           onClick={() => setTheme("light")}
//           aria-label="Light mode"
//           className={cn(
//             "flex h-8 w-8 items-center justify-center rounded-full",
//             theme === "light" ? "bg-white shadow-sm" : "text-gray-400",
//           )}
//         >
//           <Sun className="h-4 w-4" />
//         </button>
//         <button
//           type="button"
//           onClick={() => setTheme("dark")}
//           aria-label="Dark mode"
//           className={cn(
//             "flex h-8 w-8 items-center justify-center rounded-full",
//             theme === "dark" ? "bg-white shadow-sm" : "text-gray-400",
//           )}
//         >
//           <Moon className="h-4 w-4" />
//         </button>
//       </div>

//       {/* Icon actions */}
//       <div className="flex shrink-0 items-center gap-2">
//         <button
//           type="button"
//           aria-label="Messages"
//           className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
//         >
//           <MessageSquare className="h-[18px] w-[18px]" />
//           <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-violet-600" />
//         </button>
//         <button
//           type="button"
//           aria-label="Notifications"
//           className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
//         >
//           <Bell className="h-[18px] w-[18px]" />
//         </button>
//         <button
//           type="button"
//           aria-label="Calendar"
//           className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
//         >
//           <Calendar className="h-[18px] w-[18px]" />
//         </button>
//       </div>

//       {/* User */}
//       <button
//         type="button"
//         className="flex shrink-0 items-center gap-2 rounded-full pl-2 hover:bg-gray-50"
//       >
//         <div className="text-right leading-tight">
//           <p className="text-sm font-semibold text-gray-900">{user.name}</p>
//           <span className="flex items-center justify-end gap-1 text-xs text-gray-500">
//             <ChevronDown className="h-3 w-3" />
//             {user.role}
//           </span>
//         </div>
//         <div className="relative">
//           <Avatar className="h-9 w-9">
//             <AvatarImage src={user.avatarUrl} alt={user.name} />
//             <AvatarFallback>
//               {user.name
//                 .split(" ")
//                 .map((n) => n[0])
//                 .join("")}
//             </AvatarFallback>
//           </Avatar>
//           <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
//         </div>
//       </button>
//     </header>
//   );
// }

// export default Navbar;

"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronsLeft,
  Search,
  Sun,
  Moon,
  MessageSquare,
  Bell,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchModal } from "@/components/layout/SearchModal";

/**
 * NexLink Navbar
 * Next.js 16 (App Router) + Tailwind CSS v4 + shadcn/ui
 *
 * `onToggleSidebar` is called when the double-chevron button is clicked —
 * wire it to the parent's collapsed-state so it can expand/collapse <Sidebar />.
 */

interface NavbarProps {
  onToggleSidebar?: () => void;
  collapsed?: boolean;
  newLeadsCount?: number;
  user?: { name: string; role: string; avatarUrl?: string };
}

export function Navbar({
  onToggleSidebar,
  collapsed = false,
  newLeadsCount = 27,
  user = { name: "John Smith", role: "Manager" },
}: NavbarProps) {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [searchOpen, setSearchOpen] = React.useState(false);

  return (
    <header className="sticky top-0 flex h-16 w-full items-center gap-4 bg-white px-4 z-50">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
      >
        <ChevronsLeft
          className={cn(
            "h-4 w-4 transition-transform",
            collapsed && "rotate-180",
          )}
        />
      </button>

      {/* Search */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex h-10 max-w-xs flex-1 items-center gap-2 rounded-full bg-gray-100 px-4 text-left"
      >
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <span className="w-full truncate text-sm text-gray-400">
          Search anything's
        </span>
      </button>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Today new leads */}
      <div className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-gray-200 px-4">
        <span className="text-sm font-medium text-gray-800">
          Today New Leads
        </span>
        <Badge className="rounded-full bg-violet-100 px-2 py-0 text-xs font-semibold text-violet-600 hover:bg-violet-100">
          {newLeadsCount}
        </Badge>
      </div>

      <div className="flex-1" />

      {/* Light / dark toggle */}
      <div className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTheme("light")}
          aria-label="Light mode"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            theme === "light" ? "bg-white shadow-sm" : "text-gray-400",
          )}
        >
          <Sun className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          aria-label="Dark mode"
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            theme === "dark" ? "bg-white shadow-sm" : "text-gray-400",
          )}
        >
          <Moon className="h-4 w-4" />
        </button>
      </div>

      {/* Icon actions */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Messages"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
        >
          <MessageSquare className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-violet-600" />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          aria-label="Calendar"
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
        >
          <Calendar className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* User */}
      <button
        type="button"
        className="flex shrink-0 items-center gap-2 rounded-full pl-2 hover:bg-gray-50"
      >
        <div className="text-right leading-tight">
          <p className="text-sm font-semibold text-gray-900">{user.name}</p>
          <span className="flex items-center justify-end gap-1 text-xs text-gray-500">
            <ChevronDown className="h-3 w-3" />
            {user.role}
          </span>
        </div>
        <div className="relative">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
        </div>
      </button>
    </header>
  );
}

export default Navbar;
