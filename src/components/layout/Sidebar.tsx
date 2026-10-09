"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DASHBOARD_VIEWS, dashboardViewHref } from "@/lib/dashboard/views";
import { useCrmSettings } from "@/lib/settings/use-crm-settings";
import { resolveWorkspaceBrand } from "@/lib/settings/brand";
import { BrandLogo } from "@/components/settings/BrandLogo";
import type { LogoFrame, LogoSlot } from "@/lib/settings/logo-frame";
import {
  isDisplayableImageSrc,
  resolveCrmStorageUrl,
} from "@/lib/storage/api";
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
  Zap,
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
      ? "bg-[color-mix(in_srgb,var(--brand-on-secondary)_14%,transparent)] font-medium text-[var(--brand-on-secondary)]"
      : "text-[color-mix(in_srgb,var(--brand-on-secondary)_70%,transparent)] hover:bg-[color-mix(in_srgb,var(--brand-on-secondary)_10%,transparent)] hover:text-[var(--brand-on-secondary)]",
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
  { label: "E-Signature", href: "/signature", icon: Folder },
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
      { label: "Equifax", href: "/finance/equifax" },
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
  { label: "Automations", href: "/automations", icon: Zap },
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
  const crm = useCrmSettings();
  const brand = resolveWorkspaceBrand({
    ...crm.settings,
    primaryColor: crm.previewBrand?.primaryColor ?? crm.settings?.primaryColor,
    secondaryColor:
      crm.previewBrand?.secondaryColor ?? crm.settings?.secondaryColor,
  });

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

  const navScrollRef = React.useRef<HTMLDivElement>(null);
  const revealLabelRef = React.useRef<string | null>(null);

  const toggle = (label: string) => {
    revealLabelRef.current = label;
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // Opening a group inserts its children above whatever sits below the
  // heading. Scroll anchoring then shoves the heading and the first child
  // out of the top of the nav. Pull the heading back into view.
  React.useLayoutEffect(() => {
    const label = revealLabelRef.current;
    const scroller = navScrollRef.current;
    if (!label || !scroller) return;
    revealLabelRef.current = null;
    const parent = scroller.querySelector<HTMLElement>(
      `[data-nav-label="${CSS.escape(label)}"] [data-nav-parent]`,
    );
    if (!parent) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    if (parentRect.top < scrollerRect.top) {
      scroller.scrollTop -= scrollerRect.top - parentRect.top;
    }
  }, [expanded]);

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
  const savedSlot: LogoSlot | null = brand.secondaryIsLight
    ? brand.logoLightUrl
      ? "logoLight"
      : brand.logoDarkUrl
        ? "logoDark"
        : null
    : brand.logoDarkUrl
      ? "logoDark"
      : brand.logoLightUrl
        ? "logoLight"
        : null;
  const focus = crm.previewLogos?.focus;
  const focusHasLogo =
    focus === "logoLight"
      ? Boolean(brand.logoLightUrl)
      : focus === "logoDark"
        ? Boolean(brand.logoDarkUrl)
        : false;
  const logoSlot = focusHasLogo ? focus : savedSlot;
  const logoKey =
    logoSlot === "logoLight"
      ? brand.logoLightUrl
      : logoSlot === "logoDark"
        ? brand.logoDarkUrl
        : "";
  const logoFrame: LogoFrame | null = logoSlot
    ? (crm.previewLogos?.frames[logoSlot] ??
      (logoSlot === "logoLight" ? brand.logoLightFrame : brand.logoDarkFrame))
    : null;
  const [logoSrc, setLogoSrc] = React.useState("");

  React.useEffect(() => {
    if (!logoKey) {
      setLogoSrc("");
      return;
    }
    if (isDisplayableImageSrc(logoKey) || logoKey.startsWith("/")) {
      setLogoSrc(logoKey);
      return;
    }
    let cancelled = false;
    setLogoSrc("");
    void resolveCrmStorageUrl(logoKey).then((url) => {
      if (!cancelled) setLogoSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [logoKey]);

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
          "fixed inset-y-0 left-0 z-50 flex h-screen w-72 max-w-[85vw] shrink-0 flex-col overflow-hidden rounded-tr-[18px] rounded-br-[18px] [background-image:var(--brand-gradient)] px-5 py-6 text-[var(--brand-on-secondary)] transition-transform duration-200 ease-in-out",
          "border-r border-[color-mix(in_srgb,var(--brand-on-secondary)_14%,transparent)] shadow-[8px_0_40px_-2px_rgba(15,23,42,0.22),2px_0_12px_-2px_rgba(15,23,42,0.10)]",
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
              "flex min-w-0 items-center gap-2 text-xl font-semibold text-[var(--brand-on-secondary)]",
              collapsed && "md:text-base",
            )}
          >
            {logoSrc && logoFrame ? (
              <BrandLogo
                src={logoSrc}
                frame={logoFrame}
                className="h-8 w-8 shrink-0 rounded-full bg-white/15"
              />
            ) : null}
            <span className={collapsed ? "md:hidden" : undefined}>
              {brand.appName}
            </span>
            {collapsed && (
              <span className="hidden md:inline">
                {brand.appName.slice(0, 4)}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--brand-on-secondary)] hover:bg-[color-mix(in_srgb,var(--brand-on-secondary)_12%,transparent)] md:hidden"
          >
            <X className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--brand-on-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--brand-on-secondary)_12%,transparent)] md:flex"
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
              "mb-2 truncate px-1 text-xs text-[color-mix(in_srgb,var(--brand-on-secondary)_65%,transparent)]",
              hideLabel,
            )}
          >
            {tenantName}
          </p>
        )}
        <Link
          href="/settings/organization/branding"
          title="Workspace brand colours"
          className={cn(
            "mb-6 flex items-center gap-1.5 px-1",
            collapsed && "md:mb-6 md:justify-center md:px-0",
          )}
        >
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10 shadow-sm"
            style={{ backgroundColor: brand.primary }}
          />
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10 shadow-sm"
            style={{ backgroundColor: brand.secondary }}
          />
          <span
            className={cn(
              "truncate text-[10px] font-semibold tracking-wide text-[color-mix(in_srgb,var(--brand-on-secondary)_55%,transparent)] uppercase",
              hideLabel,
            )}
          >
            Brand
          </span>
        </Link>
        {/* Dashboard section */}
        <div className={cn("mb-2 px-1", hideLabel)}>
          <span className="text-[11px] font-semibold tracking-wider text-[color-mix(in_srgb,var(--brand-on-secondary)_55%,transparent)]">
            DASHBOARD
          </span>
        </div>

        <div
          ref={navScrollRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto no-scrollbar [overflow-anchor:none]"
        >
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
                <div key={item.label} data-nav-label={item.label}>
                  {hasChildren ? (
                    <button
                      type="button"
                      data-nav-parent=""
                      onClick={() => toggle(item.label)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors md:py-2",
                        iconOnly,
                        isActive
                          ? "bg-[color-mix(in_srgb,var(--brand-on-secondary)_14%,transparent)] font-medium text-[var(--brand-on-secondary)]"
                          : "text-[color-mix(in_srgb,var(--brand-on-secondary)_78%,transparent)] hover:bg-[color-mix(in_srgb,var(--brand-on-secondary)_10%,transparent)] hover:text-[var(--brand-on-secondary)]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          isActive
                            ? "text-[var(--brand-on-secondary)]"
                            : "text-[color-mix(in_srgb,var(--brand-on-secondary)_62%,transparent)]",
                        )}
                        strokeWidth={1.75}
                      />
                      <span className={cn("flex-1 text-left", hideLabel)}>
                        {item.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-[color-mix(in_srgb,var(--brand-on-secondary)_55%,transparent)] transition-transform",
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
                          ? "bg-[color-mix(in_srgb,var(--brand-on-secondary)_14%,transparent)] font-medium text-[var(--brand-on-secondary)]"
                          : "text-[color-mix(in_srgb,var(--brand-on-secondary)_78%,transparent)] hover:bg-[color-mix(in_srgb,var(--brand-on-secondary)_10%,transparent)] hover:text-[var(--brand-on-secondary)]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          isActive
                            ? "text-[var(--brand-on-secondary)]"
                            : "text-[color-mix(in_srgb,var(--brand-on-secondary)_62%,transparent)]",
                        )}
                        strokeWidth={1.75}
                      />
                      <span className={hideLabel}>{item.label}</span>
                    </Link>
                  )}

                  {hasChildren && isOpen && (
                    <div
                      className={cn(
                        "ml-[27px] flex flex-col gap-0.5 border-l border-[color-mix(in_srgb,var(--brand-on-secondary)_18%,transparent)] pl-3.5",
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
            "mt-auto shrink-0 border-t border-[color-mix(in_srgb,var(--brand-on-secondary)_14%,transparent)] bg-[color-mix(in_srgb,var(--brand-on-secondary)_8%,transparent)]",
            collapsed && "md:hidden",
          )}
        >
          <input
            ref={chatRef}
            type="text"
            placeholder="Here is your Smart Chat (Ctrl+Space)"
            className="h-10 w-full border-0 bg-transparent px-3 text-[12px] text-[var(--brand-on-secondary)] outline-none placeholder:text-[color-mix(in_srgb,var(--brand-on-secondary)_45%,transparent)]"
          />
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
