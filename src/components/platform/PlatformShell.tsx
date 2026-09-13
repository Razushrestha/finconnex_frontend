"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutGrid,
  LogOut,
  Shield,
  UserRoundX,
} from "lucide-react";
import { CrmTokenKeepAlive } from "@/components/layout/CrmTokenKeepAlive";
import { cn } from "@/lib/utils";
import { platformRoleLabel } from "@/lib/auth/platform";
import { logAuth } from "@/lib/rules";
import { clearCrmTokens } from "@/lib/activity-timeline/auth";
import { useState } from "react";

const NAV = [
  { href: "/platform", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/platform/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/platform/users", label: "Users", icon: UserRoundX },
];

export function PlatformShell({
  children,
  user,
  tenant,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role: string };
  tenant: { name: string; hasWorkspace: boolean };
}) {
  const pathname = usePathname() || "/platform";
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    logAuth("logout", user.email || user.name);
    clearCrmTokens();
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen bg-[#F4F1FA] font-sans text-slate-900">
      <aside className="hidden w-[260px] shrink-0 flex-col bg-[#0F172A] text-slate-200 lg:flex">
        <div className="border-b border-white/10 px-5 py-6">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#C4B5FD] uppercase">
            FinConnex
          </p>
          <h1 className="mt-1 text-lg font-semibold text-white">
            Platform console
          </h1>
          <p className="mt-1 text-[12px] text-slate-400">
            Tenant isolation stays in the workspace JWT. Operate across
            workspaces from here.
          </p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-[#5A32A3] text-white shadow-lg shadow-[#5A32A3]/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5A32A3] text-xs font-semibold text-white">
              {user.name
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() ?? "")
                .join("") || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">
                {user.name}
              </p>
              <p className="truncate text-[11px] text-slate-400">{user.email}</p>
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#C4B5FD] uppercase">
                <Shield className="h-3 w-3" />
                {platformRoleLabel(user.role)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[12px] font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[#5A32A3]/10 bg-white/90 px-4 py-3 backdrop-blur-md lg:px-8">
          <div className="lg:hidden">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#5A32A3] uppercase">
              Platform
            </p>
            <p className="text-sm font-semibold">{user.name}</p>
          </div>
          <nav className="flex gap-1 overflow-x-auto lg:hidden">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap",
                    active
                      ? "bg-[#5A32A3] text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto hidden items-center gap-4 lg:flex">
            <p className="text-[12px] text-slate-500">
              Same login as every other FinConnex user. Access is{" "}
              <span className="font-semibold text-[#5A32A3]">
                {platformRoleLabel(user.role)}
              </span>{" "}
              on the CRM user record.
            </p>
            {tenant.hasWorkspace ? (
              <Link
                href="/"
                className="inline-flex h-9 shrink-0 items-center rounded-full bg-[#5A32A3] px-3.5 text-[12px] font-semibold text-white"
              >
                Open {tenant.name}
              </Link>
            ) : null}
          </div>
        </header>
        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
          {tenant.hasWorkspace ? (
            <div className="mx-auto mb-5 max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You currently have a workspace token for{" "}
              <span className="font-semibold">{tenant.name}</span>. Platform
              APIs still run as your global role.{" "}
              <Link href="/" className="font-semibold underline">
                Return to that CRM
              </Link>
            </div>
          ) : null}
          {children}
        </main>
      </div>
      <CrmTokenKeepAlive />
    </div>
  );
}
