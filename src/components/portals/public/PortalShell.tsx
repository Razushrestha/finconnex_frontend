"use client";

import type { ElementType } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  FileText,
  CheckSquare,
  LifeBuoy,
  Receipt,
  BarChart3,
  LogOut,
  Home,
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
  type PortalModule,
} from "@/lib/portals/types";
import { cn } from "@/lib/utils";

const MODULE_META: Record<
  PortalModule,
  { href: string; icon: ElementType; label: string }
> = {
  Deals: { href: "deals", icon: Briefcase, label: "Deals" },
  Documents: { href: "documents", icon: FileText, label: "Documents" },
  Tasks: { href: "tasks", icon: CheckSquare, label: "Tasks" },
  Tickets: { href: "tickets", icon: LifeBuoy, label: "Tickets" },
  Invoices: { href: "invoices", icon: Receipt, label: "Invoices" },
  Reports: { href: "reports", icon: BarChart3, label: "Reports" },
};

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
    }
  }, [slug, router]);

  function logout() {
    clearPortalSession(slug);
    router.push(`/p/${slug}/login`);
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!portal) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <h1 className="text-xl font-bold text-slate-900">Portal not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          This client portal URL is invalid.
        </p>
      </div>
    );
  }

  if (portal.status !== "Active") {
    return (
      <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-slate-50 px-4 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.12),_transparent_55%)]"
        />
        <div className="relative max-w-md">
          <p className="text-[11px] font-semibold tracking-widest text-violet-600 uppercase">
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
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-sm text-slate-500">
        Redirecting to login…
      </div>
    );
  }

  const modules = effectiveModules(portal);
  const base = `/p/${slug}`;

  return (
    <div className="relative min-h-dvh bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.14),_transparent_60%)]"
      />
      <header className="relative border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-violet-600 uppercase">
              FinConnex · Client Portal
            </p>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              {portal.name}
            </h1>
            <p className="text-[11px] text-slate-500">
              {portal.clientName} · Signed in as {email}
              {portal.accessLevel !== "Full" ? (
                <span className="ml-1.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                  {portal.accessLevel}
                </span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          <Link
            href={base}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold",
              pathname === base
                ? "bg-violet-600 text-white"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          {modules.map((m) => {
            const meta = MODULE_META[m];
            const href = `${base}/${meta.href}`;
            const active = pathname.startsWith(href);
            const Icon = meta.icon;
            return (
              <Link
                key={m}
                href={href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold",
                  active
                    ? "bg-violet-600 text-white"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="relative mx-auto max-w-5xl px-4 py-5 sm:px-6">
        {children}
      </main>
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
