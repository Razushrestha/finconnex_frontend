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
  Globe,
  LineChartIcon,
  TrendingUp,
  LibraryBig,
  Calculator,
  Settings,
  Menu,
  X,
  CalendarClock,
} from "lucide-react";

type NavChildItem = {
  label: string;
  href: string;
};

type NavItem = {
  label: string;
  href?: string;
  icon?: React.ElementType;
  swatch?: string;
  badge?: string;
  children?: NavChildItem[];
};

const dashboardItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: Package },
  { label: "Work Queue", href: "/work-queue", icon: Rows4 },
  {
    label: "Sales",
    icon: BadgePercent,
    children: [
      { label: "Leads", href: "/sales/leads" },
      { label: "Contacts", href: "/sales/contacts" },
      { label: "Companies", href: "/sales/companies" },
      { label: "Deals", href: "/sales/deals" },
      { label: "Forecasting", href: "/sales/forecasting" },
    ],
  },
  {
    label: "Activities",
    icon: Notebook,
    children: [
      { label: "Tasks", href: "/activities/tasks" },
      { label: "Calls", href: "/activities/calls" },
      { label: "Messages", href: "/activities/messages" },
      { label: "Emails", href: "/activities/emails" },
      { label: "Meetings", href: "/activities/meetings" },
      { label: "Notes", href: "/activities/notes" },
      { label: "Reminders", href: "/activities/reminders" },
      { label: "Calendar", href: "/activities/calendar" },
      { label: "Team Chat", href: "/activities/team-chat" },
    ],
  },
  { label: "Booking", href: "/booking", icon: CalendarClock },
  {
    label: "Documents",
    icon: Folder,
    children: [
      { label: "Library", href: "/documents/library" },
      { label: "Document Requests", href: "/documents/requests" },
      { label: "E-Signature", href: "/documents/signature" },
    ],
  },
  {
    label: "Marketing",
    icon: Megaphone,
    children: [
      { label: "Email Campaigns", href: "/marketing/email" },
      { label: "SMS Campaigns", href: "/marketing/sms" },
      { label: "WhatsApp Campaigns", href: "/marketing/whatsapp" },
      { label: "Unified Inbox", href: "/marketing/inbox" },
      { label: "Forms", href: "/marketing/forms" },
      { label: "Linktree", href: "/marketing/linktree" },
    ],
  },
  {
    label: "Finance",
    icon: LineChart,
    children: [
      { label: "Overview", href: "/finance" },
      { label: "Estimates", href: "/finance/estimates" },
      { label: "Quotations", href: "/finance/quotations" },
      { label: "Invoices", href: "/finance/invoices" },
      { label: "Payments", href: "/finance/payments" },
      { label: "Products & Services", href: "/finance/products" },
    ],
  },
  { label: "Team Management", href: "/team", icon: UserCog },
  { label: "Support", href: "/support", icon: HelpCircle },
  { label: "Client Portal", href: "/portals", icon: Globe },
  { label: "Reports", href: "/reports", icon: LineChartIcon },
  { label: "Analytics", href: "/analytics", icon: TrendingUp },
  { label: "Resources", href: "/resources", icon: LibraryBig },
  { label: "Calculator", href: "/calculator", icon: Calculator },
  { label: "Settings", href: "/settings", icon: Settings },
];

const workItems: NavItem[] = [
  { label: "Tasks & Projects", href: "/activities/tasks", swatch: "bg-red-500" },
  { label: "User Management", href: "/team", swatch: "bg-violet-600" },
  { label: "Activities", href: "/activities/calendar", swatch: "bg-amber-500" },
  { label: "Deals", href: "/sales/deals", swatch: "bg-indigo-500", badge: "+24%" },
];

interface SidebarProps {
  collapsed?: boolean;
  tenantName?: string;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function Sidebar({
  collapsed = false,
  tenantName,
  mobileOpen: mobileOpenProp,
  onMobileOpenChange,
}: SidebarProps) {
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

  const [internalMobileOpen, setInternalMobileOpen] = React.useState(false);
  const mobileOpen = mobileOpenProp ?? internalMobileOpen;
  const setMobileOpen = React.useCallback(
    (open: boolean) => {
      onMobileOpenChange?.(open);
      if (mobileOpenProp === undefined) {
        setInternalMobileOpen(open);
      }
    },
    [onMobileOpenChange, mobileOpenProp],
  );

  const toggle = (label: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  // Close the drawer on navigation so it never stays "open" after a link tap.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close the drawer if the viewport grows past the md breakpoint while open.
  React.useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const handleChange = () => setMobileOpen(false);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prevent background scroll while the mobile drawer is open.
  React.useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  // Icon-only rail only applies on md+; the mobile drawer always shows labels.
  const hideLabel = collapsed ? "md:hidden" : undefined;
  const iconOnly = collapsed ? "md:justify-center md:px-0" : undefined;

  return (
    <>
      {/* Mobile trigger — hidden once the drawer is open (drawer has its own close button) */}
      {!mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-md md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Backdrop, mobile only */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-gray-900/50 md:hidden"
        />
      )}

      <aside
        className={cn(
          // Mobile: fixed off-canvas drawer, slides in from the left.
          "fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[85vw] shrink-0 flex-col overflow-hidden bg-white px-5 py-6 shadow-xl transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop (md+): back to a normal in-flow sticky sidebar, width driven by `collapsed`.
          "md:sticky md:top-0 md:z-0 md:w-64 md:max-w-none md:translate-x-0 md:shadow-none md:transition-[width]",
          collapsed && "md:w-[72px] md:px-3",
        )}
      >
        <div className="mb-2 flex items-center justify-between px-1">
          <Link
            href="/"
            className={cn(
              "text-xl font-semibold text-gray-900",
              collapsed && "md:text-base",
            )}
          >
            <span className={collapsed ? "md:hidden" : undefined}>
              FinConnex
            </span>
            {collapsed && <span className="hidden md:inline">FinC</span>}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50 md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {tenantName && (
          <p
            className={cn(
              "mb-6 truncate px-1 text-xs text-gray-400",
              hideLabel,
            )}
          >
            {tenantName}
          </p>
        )}
        {collapsed && <div className="hidden md:mb-6 md:block" />}

        {/* Dashboard section */}
        <div className={cn("mb-2 px-1", hideLabel)}>
          <span className="text-[11px] font-semibold tracking-wider text-violet-600">
            DASHBOARD
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto no-scrollbar">
          <nav className="flex flex-col gap-0.5">
            {dashboardItems.map((item) => {
              const hasChildren = !!item.children?.length;
              const isActive =
                (item.href && pathname === item.href) ||
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
                        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors md:py-2",
                        iconOnly,
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
                      <span className={cn("flex-1 text-left", hideLabel)}>
                        {item.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform",
                          isOpen && "rotate-180",
                          hideLabel,
                        )}
                      />
                    </button>
                  ) : (
                    <Link
                      href={item.href!}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors md:py-2",
                        iconOnly,
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
                      <span className={hideLabel}>{item.label}</span>
                    </Link>
                  )}

                  {hasChildren && isOpen && (
                    <div
                      className={cn(
                        "ml-[27px] flex flex-col gap-0.5 border-l border-gray-100 pl-3.5",
                        collapsed && "md:hidden",
                      )}
                    >
                      {item.children!.map((child) => {
                        const childActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "rounded-lg px-2.5 py-2 text-sm transition-colors md:py-1.5",
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
                href={item.href!}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 md:py-2",
                  iconOnly,
                )}
              >
                <span
                  className={cn("h-4 w-4 shrink-0 rounded-[5px]", item.swatch)}
                />
                <span className={cn("flex-1", hideLabel)}>{item.label}</span>
                {item.badge && (
                  <Badge
                    className={cn(
                      "bg-emerald-500 px-2 py-0 text-[11px] font-medium text-white hover:bg-emerald-500",
                      hideLabel,
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
