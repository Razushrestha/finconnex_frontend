"use client";

import { Plus, Download } from "lucide-react";

export interface CampaignBreadcrumb {
  label: string;
  href?: string;
}

interface CampaignHeaderProps {
  /** Kept for call-site compat; crumbs are no longer rendered. */
  breadcrumbs?: CampaignBreadcrumb[];
  /** Page title — the entity name (Email Campaigns, Forms, …), not "Marketing". */
  title: string;
  totalCount?: number;
  onExport?: () => void;
  exportLabel?: string;
  onCreate?: () => void;
  createLabel?: string;
}

/**
 * Compact page chrome shared across marketing list surfaces.
 * Matches EntityHeader density used on Sales pages.
 */
export function CampaignHeader({
  breadcrumbs: _breadcrumbs,
  title,
  totalCount,
  onExport,
  exportLabel = "Export",
  onCreate,
  createLabel = "New",
}: CampaignHeaderProps) {
  void _breadcrumbs;
  return (
    <div className="w-full shrink-0 border-b border-slate-200/80 bg-background">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-1 py-2 sm:gap-x-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {totalCount !== undefined ? (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
              {totalCount}
            </span>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {onExport ? (
            <button
              type="button"
              onClick={onExport}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exportLabel}
            </button>
          ) : null}
          {onCreate ? (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" />
              {createLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
