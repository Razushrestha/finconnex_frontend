"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  Shield,
  Users,
} from "lucide-react";
import { getPlatformStats, type PlatformStats } from "@/lib/platform/api";

type Health = {
  ok?: boolean;
  status?: string;
};

export function PlatformHome() {
  const [health, setHealth] = useState<Health | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [h, platformStats] = await Promise.all([
          fetch("/api/platform/health", { credentials: "same-origin" }).then(
            (r) => r.json() as Promise<Health>,
          ),
          getPlatformStats(),
        ]);
        if (cancelled) return;
        setHealth(h);
        setStats(platformStats);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load platform overview",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Operations overview
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
          Super Admin console for Nest{" "}
          <span className="font-mono text-[12px]">/v1/platform/*</span>. List
          every tenant and user, manage lifecycle, and enter a workspace with a
          scoped token. Tenant CRM data stays inside the selected workspace.
        </p>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Workspaces"
          value={stats == null ? "…" : String(stats.totalWorkspaces)}
          hint="GET /v1/platform/stats"
        />
        <StatCard
          icon={Shield}
          label="Active"
          value={stats == null ? "…" : String(stats.activeWorkspaces)}
          hint={`${stats?.suspendedWorkspaces ?? "…"} suspended`}
          tone="good"
        />
        <StatCard
          icon={Users}
          label="Users"
          value={stats == null ? "…" : String(stats.totalUsers)}
          hint={`${stats?.superAdmins ?? "…"} super admins`}
        />
        <StatCard
          icon={Activity}
          label="CRM health"
          value={
            health == null ? "…" : health.ok ? "Healthy" : health.status ?? "Down"
          }
          hint="GET /health"
          tone={health == null ? "neutral" : health.ok ? "good" : "bad"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Link
          href="/platform/workspaces"
          className="group rounded-3xl border border-white bg-white p-6 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
            <Building2 className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">All workspaces</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Search tenants, suspend or restore, then enter one. Entering mints a
            workspace JWT for the normal CRM dashboard.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-primary)]">
            Open directory
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link
          href="/platform/users"
          className="group rounded-3xl border border-white bg-white p-6 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-[var(--brand-primary)]">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Platform users</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Directory of every account across tenants. Grant or revoke{" "}
            <span className="font-mono text-[12px]">globalRole</span> including
            Super Admin.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-primary)]">
            Open users
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "good" | "bad";
}) {
  return (
    <div className="rounded-3xl border border-white bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
          {label}
        </p>
        <Icon className="h-4 w-4 text-[var(--brand-primary)]" />
      </div>
      <p
        className={
          tone === "good"
            ? "mt-3 text-2xl font-semibold text-emerald-600"
            : tone === "bad"
              ? "mt-3 text-2xl font-semibold text-rose-600"
              : "mt-3 text-2xl font-semibold text-slate-900"
        }
      >
        {value}
      </p>
      <p className="mt-1 font-mono text-[11px] text-slate-400">{hint}</p>
    </div>
  );
}
