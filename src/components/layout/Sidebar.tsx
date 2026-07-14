"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  BadgePercent,
  LineChart,
  UserCog,
  IdCard,
  UserRound,
  Star,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon?: React.ElementType;
  swatch?: string;
  badge?: string;
};

const dashboardItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: Package },
  { label: "Sales", href: "/sales", icon: BadgePercent },
  { label: "Finance", href: "/finance", icon: LineChart },
  { label: "Team Management", href: "/team", icon: UserCog },
  { label: "Employees", href: "/employees", icon: IdCard },
  { label: "Customers", href: "/customers", icon: UserRound },
  { label: "Review", href: "/review", icon: Star },
];

const workItems: NavItem[] = [
  { label: "Tasks & Projects", href: "/tasks", swatch: "bg-red-500" },
  { label: "User Management", href: "/users", swatch: "bg-violet-600" },
  { label: "Activities", href: "/activities", swatch: "bg-amber-500" },
  { label: "Deals", href: "/deals", swatch: "bg-indigo-500", badge: "+24%" },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "sticky top-0 left-0 flex h-screen shrink-0 flex-col bg-white py-6 transition-[width] duration-200",
        collapsed ? "w-[72px] px-3" : "w-64 px-5",
      )}
    >
      <Link
        href="/"
        className={cn(
          "mb-8 px-1 text-xl font-semibold text-gray-900",
          collapsed && "text-center text-base",
        )}
      >
        {collapsed ? "FinC" : "FinConnex"}
      </Link>

      {/* Dashboard section */}
      {!collapsed && (
        <div className="mb-2 px-1">
          <span className="text-[11px] font-semibold tracking-wider text-violet-600">
            DASHBOARD
          </span>
        </div>
      )}

      <nav className="flex flex-col gap-0.5">
        {dashboardItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon!;
          return (
            <Link
              key={item.label}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                collapsed && "justify-center px-0",
                isActive
                  ? "text-violet-600 font-medium"
                  : "text-gray-700 hover:bg-gray-50",
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  isActive ? "text-violet-600" : "text-gray-500",
                )}
                strokeWidth={1.75}
              />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="my-4 border-t border-gray-100" />

      <nav className="flex flex-col gap-0.5">
        {workItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-50",
              collapsed && "justify-center px-0",
            )}
          >
            <span
              className={cn("h-4 w-4 shrink-0 rounded-[5px]", item.swatch)}
            />
            {!collapsed && <span className="flex-1">{item.label}</span>}
            {!collapsed && item.badge && (
              <Badge className="bg-emerald-500 px-2 py-0 text-[11px] font-medium text-white hover:bg-emerald-500">
                {item.badge}
              </Badge>
            )}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
