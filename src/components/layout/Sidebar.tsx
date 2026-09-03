"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Package,
  BadgePercent,
  LineChart,
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
  Route,
  Settings,
  Users,
  X,
  CalendarClock,
  Timer,
  Scale,
  ChevronsLeft,
  Link2,
} from "lucide-react";

type NavChildItem = {
  label: string;
  href: string;
};

type NavItem = {
  label: string;
  href?: string;
  icon?: React.ElementType;
  children?: NavChildItem[];
};

function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isChildNavActive(
  pathname: string,
  href: string,
  siblings: NavChildItem[],
): boolean {
  if (!isNavActive(pathname, href)) return false;
  const matches = siblings.filter((item) => isNavActive(pathname, item.href));
  if (matches.length === 0) return false;
  const bestMatch = matches.reduce((longest, item) =>
    item.href.length > longest.href.length ? item : longest,
  );
  return bestMatch.href === href;
}

const childNavClass = (active: boolean) =>
  cn(
    "rounded-lg px-2.5 py-2 text-sm transition-colors md:py-1.5",
    active
      ? "bg-violet-50 font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300"
      : "text-muted-foreground hover:bg-accent hover:text-foreground",
  );

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
      { label: "Messages", href: "/marketing/inbox" },
      { label: "Emails", href: "/activities/emails" },
      { label: "Meetings", href: "/activities/meetings" },
      { label: "Notes", href: "/activities/notes" },
      { label: "Attachments", href: "/activities/attachments" },
      { label: "Reminders", href: "/activities/reminders" },
    ],
  },
  {
    label: "Booking",
    icon: CalendarClock,
    children: [
      { label: "Home", href: "/booking" },
      { label: "Consultations", href: "/booking/consultations" },
      { label: "Schedules", href: "/booking/schedules" },
      { label: "Consultants", href: "/booking/consultants" },
    ],
  },
  {
    label: "Documents",
    icon: Folder,
    children: [
      { label: "Library", href: "/documents/library" },
      { label: "Document Requests", href: "/documents/requests" },
      { label: "All Requests", href: "/documents/requests/all" },
    ],
  },
  {
    label: "E-Signature",
    icon: Folder,
    children: [
      { label: "Overview", href: "/signature" },
      { label: "Documents", href: "/signature/documents" },
      { label: "Templates", href: "/signature/templates" },
    ],
  },
  {
    label: "Marketing",
    icon: Megaphone,
    children: [
      { label: "Email Campaigns", href: "/marketing/email" },
      { label: "SMS Campaigns", href: "/marketing/sms" },
      { label: "WhatsApp Campaigns", href: "/marketing/whatsapp" },
      { label: "Forms", href: "/marketing/forms" },
      { label: "Broker pages", href: "/marketing/linktree" },
    ],
  },
  {
    label: "Smart Link",
    icon: Link2,
    children: [
      { label: "Templates", href: "/smart-link/templates" },
      { label: "Builder", href: "/smart-link/builder" },
      { label: "Shortner", href: "/smart-link/shortner" },
    ],
  },
  {
    label: "Finance",
    icon: LineChart,
    children: [
      { label: "Hub", href: "/finance" },
      { label: "Estimates", href: "/finance/estimates" },
      { label: "Quotations", href: "/finance/quotations" },
      { label: "Invoices", href: "/finance/invoices" },
      { label: "Credit Notes", href: "/finance/credit-notes" },
      { label: "Payments", href: "/finance/payments" },
      { label: "Items / Services", href: "/finance/products" },
      { label: "Service Agreements", href: "/finance/agreements" },
    ],
  },
  { label: "Support", href: "/support", icon: HelpCircle },
  { label: "Time Tracking", href: "/time-tracking", icon: Timer },
  { label: "Client Portal", href: "/portals", icon: Globe },
  { label: "Reports", href: "/reports", icon: LineChartIcon },
  { label: "Analytics", href: "/analytics", icon: TrendingUp },
  { label: "Resources", href: "/resources", icon: LibraryBig },
  { label: "Calculator", href: "/calculator", icon: Calculator },
  { label: "Journeys", href: "/journeys", icon: Route },
  { label: "Rules", href: "/rules", icon: Scale },
  { label: "Users", href: "/users", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  collapsed?: boolean;
  tenantName?: string;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  onToggleSidebar?: () => void;
}

export function Sidebar({
  collapsed = false,
  tenantName,
  mobileOpen: mobileOpenProp,
  onMobileOpenChange,
  onToggleSidebar,
}: SidebarProps) {
  const pathname = usePathname();
  const chatRef = React.useRef<HTMLInputElement>(null);

  const [expanded, setExpanded] = React.useState<Set<string>>(() => {
    const initial = new Set<string>();
    dashboardItems.forEach((item) => {
      if (item.children?.some((c) => isNavActive(pathname, c.href))) {
        initial.add(item.label);
      }
    });
    return initial;
  });

  React.useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      dashboardItems.forEach((item) => {
        if (item.children?.some((c) => isNavActive(pathname, c.href))) {
          next.add(item.label);
        }
      });
      return next;
    });
  }, [pathname]);

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

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close the drawer if the viewport grows past the md breakpoint while open.
  React.useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const handleChange = () => setMobileOpen(false);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        chatRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Icon-only rail only applies on md+; the mobile drawer always shows labels.
  const hideLabel = collapsed ? "md:hidden" : undefined;
  const iconOnly = collapsed ? "md:justify-center md:px-0" : undefined;

  return (
    <>
      {/* Backdrop, mobile only */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-background/70 md:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[85vw] shrink-0 flex-col overflow-hidden rounded-tr-[18px] rounded-br-[18px] bg-white px-5 py-6 transition-transform duration-200 ease-in-out dark:bg-zinc-950",
          // Elevated rail: stronger depth + right edge
          "border-r border-slate-200/90 shadow-[8px_0_40px_-2px_rgba(15,23,42,0.22),2px_0_12px_-2px_rgba(15,23,42,0.10)] dark:border-zinc-800 dark:shadow-[8px_0_44px_-4px_rgba(0,0,0,0.65),2px_0_14px_-2px_rgba(0,0,0,0.4)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:sticky md:top-0 md:z-20 md:w-64 md:max-w-none md:translate-x-0 md:rounded-tr-[18px] md:rounded-br-[18px] md:transition-[width,box-shadow,border-radius] md:pb-10",
          collapsed && "md:w-[72px] md:px-3",
        )}
      >
        <div
          className={cn(
            "mb-2 flex items-center px-1",
            collapsed
              ? "justify-between md:flex-col md:gap-2"
              : "justify-between",
          )}
        >
          <Link
            href="/"
            className={cn(
              "text-xl font-semibold text-foreground",
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
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent md:hidden"
          >
            <X className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent md:flex"
          >
            <ChevronsLeft
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180",
              )}
            />
          </button>
        </div>

        {tenantName && (
          <p
            className={cn(
              "mb-6 truncate px-1 text-xs text-muted-foreground",
              hideLabel,
            )}
          >
            {tenantName}
          </p>
        )}
        {collapsed && <div className="hidden md:mb-6 md:block" />}

        {/* Dashboard section */}
        <div className={cn("mb-2 px-1", hideLabel)}>
          <span className="text-[11px] font-semibold tracking-wider text-violet-600 dark:text-violet-400">
            DASHBOARD
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto no-scrollbar">
          <nav className="flex flex-col gap-0.5">
            {dashboardItems.map((item) => {
              const hasChildren = !!item.children?.length;
              const isActive =
                (item.href && isNavActive(pathname, item.href)) ||
                (hasChildren &&
                  item.children!.some((c) => isNavActive(pathname, c.href)));
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
                          ? "text-violet-600 dark:text-violet-400 font-medium"
                          : "text-foreground/80 hover:bg-accent",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          isActive
                            ? "text-violet-600 dark:text-violet-400"
                            : "text-muted-foreground",
                        )}
                        strokeWidth={1.75}
                      />
                      <span className={cn("flex-1 text-left", hideLabel)}>
                        {item.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
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
                          ? "text-violet-600 dark:text-violet-400 font-medium"
                          : "text-foreground/80 hover:bg-accent",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          isActive
                            ? "text-violet-600 dark:text-violet-400"
                            : "text-muted-foreground",
                        )}
                        strokeWidth={1.75}
                      />
                      <span className={hideLabel}>{item.label}</span>
                    </Link>
                  )}

                  {hasChildren && isOpen && (
                    <div
                      className={cn(
                        "ml-[27px] flex flex-col gap-0.5 border-l border-border pl-3.5",
                        collapsed && "md:hidden",
                      )}
                    >
                      {item.children!.map((child) => {
                        const childActive = isChildNavActive(
                          pathname,
                          child.href,
                          item.children!,
                        );
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={childNavClass(childActive)}
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
        </div>

        <div
          className={cn(
            "mt-auto shrink-0 border-t border-slate-200 bg-white",
            collapsed && "md:hidden",
          )}
        >
          <input
            ref={chatRef}
            type="text"
            placeholder="Here is your Smart Chat (Ctrl+Space)"
            className="h-10 w-full border-0 bg-white px-3 text-[12px] text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
