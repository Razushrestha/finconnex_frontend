"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { findIntegration } from "@/lib/integrations/catalog";

import {
  IntegrationLogo,
  IntegrationPanel,
  isIntegrationConnected,
  useIntegrationStatuses,
} from "./integration-shared";

/** One integration's own page: /settings/integrations/:id. */
export function IntegrationDetailClient({ id }: { id: string }) {
  const item = findIntegration(id);
  const { statuses, loading, refresh } = useIntegrationStatuses();
  if (!item) return null;
  const connected = isIntegrationConnected(item, statuses);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/settings/integrations"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-[var(--brand-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All integrations
      </Link>
      <div className="flex items-start gap-4">
        <IntegrationLogo item={item} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-bold text-slate-900">
              {item.name}
            </h1>
            {!loading && connected ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                Connected
              </span>
            ) : null}
          </div>
          <p className="text-[13px] text-slate-500">{item.blurb}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{item.category}</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <IntegrationPanel item={item} statuses={statuses} onChanged={refresh} />
      </div>
    </div>
  );
}
