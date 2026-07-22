"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPortalBySlug,
  getPortalSession,
  setPortalSession,
  type ClientPortal,
} from "@/lib/portals/types";
import { recordPortalLogin } from "@/components/portals/public/PortalShell";

export function PortalLoginClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [portal, setPortal] = useState<ClientPortal | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = getPortalBySlug(slug) ?? null;
    setPortal(p);
    setReady(true);
    if (p?.status === "Active" && getPortalSession(slug)) {
      router.replace(`/p/${slug}`);
    }
  }, [slug, router]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!portal || portal.status !== "Active") return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    if (trimmed !== portal.primaryContactEmail.toLowerCase()) {
      setError(
        `Use the invited email (${portal.primaryContactEmail}) for this mock login`,
      );
      return;
    }
    setPortalSession(slug, portal.primaryContactEmail);
    recordPortalLogin(slug, portal.primaryContactEmail);
    router.push(`/p/${slug}`);
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
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 text-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Portal not found</h1>
        </div>
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
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{portal.name}</h1>
          <p className="mt-3 text-sm text-slate-600">
            This portal is <strong>{portal.status}</strong> and cannot be
            accessed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-slate-50 px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.16),_transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-size-[24px_24px]"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-violet-600 uppercase">
            FinConnex
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {portal.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to view deals, documents, invoices, and support — for{" "}
            {portal.clientName}.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-slate-100/80 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
        >
          <label className="mb-1.5 block text-[12px] font-semibold text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder={portal.primaryContactEmail}
            className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[13px] outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
          />
          {error ? (
            <p className="mt-2 text-[11px] font-medium text-rose-500">{error}</p>
          ) : (
            <p className="mt-2 text-[11px] text-slate-400">
              Mock login — use {portal.primaryContactEmail}
            </p>
          )}
          <button
            type="submit"
            className="mt-4 h-11 w-full rounded-xl bg-violet-600 text-[13px] font-semibold text-white shadow-lg shadow-violet-600/25 hover:bg-violet-700"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
