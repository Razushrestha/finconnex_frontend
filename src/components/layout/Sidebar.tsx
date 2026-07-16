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
  Notebook,
  ChevronDown,
  Rows4,
  Folder,
  Megaphone,
  HelpCircle,
  LineChartIcon,
  TrendingUp,
  LibraryBig,
  Calculator,
  Settings,
} from "lucide-react";

type NavItem = {
  label: string;
  href?: string;
  icon?: React.ElementType;
  swatch?: string;
  badge?: string;
  children?: NavItem[];
};

const dashboardItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: Package },
  { label: "Work Queue", href: "/work-queue", icon: Rows4 },
  {
    label: "Sales",
    icon: BadgePercent,
    children: [
      { label: "Leads", href: "/sales" },
      { label: "Contacts", href: "/sales/contacts" },
      { label: "Deals", href: "/sales/deals" },
    ],
  },
  {
    label: "Activities",
    icon: Notebook,
    children: [
      { label: "Tasks", href: "/activities" },
      { label: "Calls", href: "/activities/calls" },
      { label: "Messages", href: "/activities/messages" },
      { label: "Emails", href: "/activities/emails" },
      { label: "Meetings", href: "/activities/meetings" },
      { label: "Notes", href: "/activities/notes" },
      { label: "Reminders", href: "/activities/reminders" },
    ],
  },
  {
    label: "Documents",
    icon: Folder,
    children: [
      { label: "Document Requests", href: "/documents/request" },
      { label: "E-Signature", href: "/documents/signature" },
    ],
  },
  {
    label: "Marketing",
    icon: Megaphone,
    children: [
      { label: "Email Campaigns", href: "/marketing/email" },
      { label: "SMS Campaigns", href: "/marketing/sms" },
      { label: "Forms", href: "/marketing/forms" },
      { label: "Linktree", href: "/marketing/linktree" },
    ],
  },
  {
    label: "Finance",
    icon: LineChart,
    children: [
      { label: "Estimates", href: "/finance" },
      { label: "Quotations", href: "/finance//quotations" },
      { label: "Invoices", href: "/finance/invoices" },
      { label: "Payments", href: "/finance/payments" },
      { label: "Products & Services", href: "/finance/ps" },
    ],
  },
  { label: "Team Management", href: "/team", icon: UserCog },
  { label: "Support", href: "/support", icon: HelpCircle },
  { label: "Reports", href: "/reports", icon: LineChartIcon },
  { label: "Analytics", href: "/analytics", icon: TrendingUp },
  { label: "Resources", href: "/resources", icon: LibraryBig },
  { label: "Calculator", href: "/calculator", icon: Calculator },
  { label: "Settings", href: "/settings", icon: Settings },
];

const workItems: NavItem[] = [
  { label: "Tasks & Projects", href: "/tasks", swatch: "bg-red-500" },
  { label: "User Management", href: "/users", swatch: "bg-violet-600" },
  { label: "Activities", href: "/activities", swatch: "bg-amber-500" },
  { label: "Deals", href: "/deals", swatch: "bg-indigo-500", badge: "+24%" },
];

interface SidebarProps {
  collapsed?: boolean;
  tenantName?: string;
}

export function Sidebar({ collapsed = false, tenantName }: SidebarProps) {
  const pathname = usePathname();

  const [expanded, setExpanded] = React.useState<Set<string>>(() => {
    const initial = new Set<string>();
    dashboardItems.forEach((item) => {
      if (item.children?.some((c) => pathname.startsWith(c.href))) {
        initial.add(item.label);
      }
    });
    return initial;
  });

  const toggle = (label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

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
          "mb-2 px-1 text-xl font-semibold text-gray-900",
          collapsed && "text-center text-base",
        )}
      >
        {collapsed ? "FinC" : "FinConnex"}
      </Link>

      {!collapsed && tenantName && (
        <p className="mb-6 truncate px-1 text-xs text-gray-400">{tenantName}</p>
      )}
      {collapsed && <div className="mb-6" />}

      {/* Dashboard section */}
      {!collapsed && (
        <div className="mb-2 px-1">
          <span className="text-[11px] font-semibold tracking-wider text-violet-600">
            DASHBOARD
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto no-scrollbar">
        <nav className="flex flex-col gap-0.5">
          {dashboardItems.map((item) => {
            const hasChildren = !!item.children?.length;
            const isActive =
              pathname === item.href ||
              (hasChildren &&
                item.children!.some((c) => pathname.startsWith(c.href)));
            const isOpen = expanded.has(item.label);
            const Icon = item.icon!;

            return (
              <div key={item.label}>
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggle(item.label)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
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
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform",
                            isOpen && "rotate-180",
                          )}
                        />
                      </>
                    )}
                  </button>
                ) : (
                  <Link
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
                )}

                {hasChildren && !collapsed && isOpen && (
                  <div className="ml-[27px] flex flex-col gap-0.5 border-l border-gray-100 pl-3.5">
                    {item.children!.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                            childActive
                              ? "text-violet-600 font-medium"
                              : "text-gray-600 hover:bg-gray-50",
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
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
      </div>
    </aside>
  );
}

export default Sidebar;
