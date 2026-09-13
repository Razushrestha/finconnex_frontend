"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  ShieldAlert,
  Users,
} from "lucide-react";
import { listAdminWorkspaces } from "@/lib/admin/api";

type Health = {
  ok?: boolean;
  status?: string;
};

export function PlatformHome() {
  const [health, setHealth] = useState<Health | null>(null);
  const [workspaceTotal, setWorkspaceTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [h, workspaces] = await Promise.all([
          fetch("/api/platform/health", { credentials: "same-origin" }).then(
            (r) => r.json() as Promise<Health>,
          ),
          listAdminWorkspaces({ page: 1, limit: 1 }),
        ]);
        if (cancelled) return;
        setHealth(h);
        setWorkspaceTotal(workspaces.total);
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
          This console maps to Nest platform APIs only: list every workspace,
          enter a tenant with a workspace-scoped token, and delete a global
          user by id. Tenant Settings, CRM records, and billing stay inside a
          selected workspace.
        </p>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Building2}
          label="Workspaces"
          value={workspaceTotal == null ? "…" : String(workspaceTotal)}
          hint="GET /v1/admin/workspaces"
        />
        <StatCard
          icon={Activity}
          label="CRM health"
          value={
            health == null ? "…" : health.ok ? "Healthy" : health.status ?? "Down"
          }
          hint="GET /health"
          tone={
            health == null ? "neutral" : health.ok ? "good" : "bad"
          }
        />
        <StatCard
          icon={Users}
          label="Platform users"
          value="By id"
          hint="No list API — delete only"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Link
          href="/platform/workspaces"
          className="group rounded-3xl border border-white bg-white p-6 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#5A32A3]/10 text-[#5A32A3]">
            <Building2 className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">All workspaces</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Search tenants, then enter one. Entering mints a workspace JWT —
            you then use the normal CRM dashboard and Settings for that tenant.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#5A32A3]">
            Open directory
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link
          href="/platform/users"
          className="group rounded-3xl border border-white bg-white p-6 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Dangerous user delete</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Nest exposes DELETE /v1/admin/user/:id only. There is no platform
            user directory until the backend adds one.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-rose-600">
            Open controls
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
        <Icon className="h-4 w-4 text-[#5A32A3]" />
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
