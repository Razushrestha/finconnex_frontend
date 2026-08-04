"use client";

import Link from "next/link";
import { Home, Plus, Download } from "lucide-react";

export interface CampaignBreadcrumb {
  label: string;
  href?: string;
}

interface CampaignHeaderProps {
  /** e.g. [{ label: "Home", href: "/" }, { label: "Marketing" }, { label: "Email Campaigns" }] */
  breadcrumbs: CampaignBreadcrumb[];
  /** Big page title, e.g. "Marketing" */
  title: string;
  onExport?: () => void;
  exportLabel?: string;
  onCreate?: () => void;
  createLabel?: string;
}

/**
 * Page header shared across every campaign surface (Email, SMS, WhatsApp, ...).
 * Only the copy and the two callbacks change per surface.
 */
export function CampaignHeader({
  breadcrumbs,
  title,
  onExport,
  exportLabel = "Export",
  onCreate,
  createLabel = "New",
}: CampaignHeaderProps) {
  return (
    <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <nav className="flex items-center gap-1.5 text-[13px] text-slate-400">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.label} className="flex items-center gap-1.5">
              {i > 0 ? <span>/</span> : null}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="flex items-center gap-1 hover:text-slate-600"
                >
                  {i === 0 ? <Home className="h-3.5 w-3.5" /> : null}
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-500">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2.5">
        {onExport ? (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            {exportLabel}
          </button>
        ) : null}
        {onCreate ? (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            {createLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
