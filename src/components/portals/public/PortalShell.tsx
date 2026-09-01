"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  UserRound,
  X,
} from "lucide-react";
import {
  appendPortalActivity,
  appendPortalAudit,
  canWriteInPortal,
  clearPortalSession,
  effectiveModules,
  formatPortalAt,
  getPortalBySlug,
  getPortalSession,
  upsertPortal,
  type ClientPortal,
} from "@/lib/portals/types";
import {
  formatMessageAt,
  getMortgageState,
  hasPortalConsent,
  unreadMessages,
  unreadNotifications,
  type MortgagePortalState,
} from "@/lib/portals/mortgage";
import { InitialsAvatar, PortalBrand } from "@/components/portals/public/mortgage/PortalBrand";
import { cn } from "@/lib/utils";

function initialsOfClientName(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

const NAV = [
  { label: "Home", href: "", icon: Home },
  { label: "Documents", href: "documents", icon: FileText },
  { label: "Fact Find", href: "fact-find", icon: ClipboardList },
  { label: "Messages", href: "messages", icon: MessageSquare },
  { label: "Profile", href: "profile", icon: UserRound },
];

export function PortalShell({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [portal, setPortal] = useState<ClientPortal | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mortgage, setMortgage] = useState<MortgagePortalState | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const notesRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = getPortalBySlug(slug) ?? null;
    setPortal(p);
    const session = getPortalSession(slug);
    setEmail(session);
    setReady(true);
    if (!p) return;
    if (p.status !== "Active") return;
    if (!session) {
      router.replace(`/p/${slug}/login`);
      return;
    }
    if (!hasPortalConsent(slug, p)) {
      router.replace(`/p/${slug}/login`);
      return;
    }
    setMortgage(getMortgageState(slug, p));
  }, [slug, router]);

  useEffect(() => {
    function onChange() {
      const p = getPortalBySlug(slug);
      if (p) setMortgage(getMortgageState(slug, p));
    }
    window.addEventListener("portal-mortgage-change", onChange);
    return () => window.removeEventListener("portal-mortgage-change", onChange);
  }, [slug]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (notesRef.current && !notesRef.current.contains(t)) setNotesOpen(false);
      if (userRef.current && !userRef.current.contains(t)) setUserOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setNotesOpen(false);
    setUserOpen(false);
  }, [pathname]);

  function logout() {
    clearPortalSession(slug);
    router.push(`/p/${slug}/login`);
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F7F6F9] text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!portal) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F7F6F9] px-4 text-center">
        <h1 className="text-xl font-bold text-slate-900">Portal not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          This client portal URL is invalid.
        </p>
      </div>
    );
  }

  if (portal.status !== "Active") {
    return (
      <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#F7F6F9] px-4 text-center">
        <div className="relative max-w-md">
          <p className="text-[11px] font-semibold tracking-widest text-[#5A32A3] uppercase">
            FinConnex
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {portal.name}
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            This portal is{" "}
            <strong className="text-slate-900">{portal.status}</strong>. Please
            contact your broker if you need access.
          </p>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F7F6F9] text-sm text-slate-500">
        Redirecting to login…
      </div>
    );
  }

  const base = `/p/${slug}`;
  const clientName = mortgage
    ? `${mortgage.client.firstName} ${mortgage.client.lastName}`.trim()
    : portal.primaryContactName;
  const firstName = mortgage?.client.firstName ?? clientName.split(" ")[0];
  const clientInitials = mortgage
    ? initialsOfClientName(mortgage.client.firstName, mortgage.client.lastName)
    : initialsOfClientName(firstName, "");
  const msgCount = mortgage ? unreadMessages(mortgage.messages) : 0;
  const noteCount = mortgage ? unreadNotifications(mortgage.notifications) : 0;

  return (
    <div className="flex h-dvh overflow-hidden bg-[#F7F6F9] text-slate-900">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col border-r border-slate-200/80 bg-white px-3 py-3.5 transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          desktopCollapsed && "lg:hidden",
        )}
      >
        <div className="flex items-center justify-between px-1">
          <PortalBrand compact />
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => {
            const href = item.href ? `${base}/${item.href}` : base;
            const active = item.href
              ? pathname === href || pathname.startsWith(`${href}/`)
              : pathname === base;
            const Icon = item.icon;
            const badge = item.href === "messages" ? msgCount : 0;
            return (
              <Link
                key={item.label}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-semibold transition-colors",
                  active
                    ? "bg-[#5A32A3] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {badge > 0 ? (
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                      active ? "bg-white text-[#5A32A3]" : "bg-[#5A32A3] text-white",
                    )}
                  >
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-3 sm:px-4">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            onClick={() => {
              if (window.matchMedia("(min-width: 1024px)").matches) {
                setDesktopCollapsed((v) => !v);
              } else {
                setSidebarOpen(true);
              }
            }}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative" ref={notesRef}>
              <button
                type="button"
                onClick={() => {
                  setNotesOpen((v) => !v);
                  setUserOpen(false);
                }}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {noteCount > 0 ? (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                ) : null}
              </button>
              {notesOpen ? (
                <div className="absolute top-11 right-0 z-50 w-[320px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-3 text-[13px] font-bold text-slate-900">
                    Notifications
                  </div>
                  <ul className="max-h-[360px] overflow-auto">
                    {(mortgage?.notifications ?? []).map((n) => (
                      <li key={n.id}>
                        <Link
                          href={`${base}/${n.href}`}
                          className={cn(
                            "block px-4 py-3 hover:bg-slate-50",
                            !n.read && "bg-violet-50/60",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[12px] font-semibold text-slate-900">
                              {n.title}
                            </span>
                            {!n.read ? (
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5A32A3]" />
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-500">{n.body}</p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            {formatMessageAt(n.at)}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="relative" ref={userRef}>
              <button
                type="button"
                onClick={() => {
                  setUserOpen((v) => !v);
                  setNotesOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl py-1 pr-1 pl-2 hover:bg-slate-50"
              >
                <span className="hidden text-[12px] font-semibold text-slate-800 sm:inline">
                  {clientName}
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
                <InitialsAvatar initials={clientInitials} size="sm" />
              </button>
              {userOpen ? (
                <div className="absolute top-11 right-0 z-50 w-48 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-xl">
                  <Link
                    href={`${base}/profile`}
                    className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <UserRound className="h-3.5 w-3.5" />
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function usePortalContext(slug: string) {
  const [portal, setPortal] = useState<ClientPortal | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setPortal(getPortalBySlug(slug) ?? null);
    setEmail(getPortalSession(slug));
  }, [slug]);

  function refresh() {
    setPortal(getPortalBySlug(slug) ?? null);
  }

  function logActivity(action: string) {
    const p = getPortalBySlug(slug);
    if (!p) return;
    const actor = email ?? p.primaryContactName;
    const next = appendPortalActivity(p, action, actor);
    upsertPortal(next);
    setPortal(next);
  }

  return {
    portal,
    email,
    refresh,
    logActivity,
    modules: portal ? effectiveModules(portal) : [],
    canWrite: portal ? canWriteInPortal(portal) : false,
    isReadOnly: portal?.accessLevel === "Read-only",
  };
}

export function recordPortalLogin(slug: string, email: string) {
  const p = getPortalBySlug(slug);
  if (!p) return;
  let next: ClientPortal = {
    ...p,
    lastLoginAt: formatPortalAt(),
  };
  next = appendPortalActivity(next, "Client logged in", email);
  next = appendPortalAudit(next, "Client logged in", email);
  upsertPortal(next);
}
