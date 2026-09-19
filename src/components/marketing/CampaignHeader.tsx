"use client";

import { Plus, Download } from "lucide-react";

export interface CampaignBreadcrumb {
  label: string;
  href?: string;
}

interface CampaignHeaderProps {
  /** Kept for call-site compat; crumbs are no longer rendered. */
  breadcrumbs?: CampaignBreadcrumb[];
  /**
   * Kept for call-site compat. Page title is shown by the navbar
   * (`getModuleTitle`) — do not render a second H1 here.
   */
  title?: string;
  /** Kept for call-site compat; count lives with list filters when needed. */
  totalCount?: number;
  onExport?: () => void;
  exportLabel?: string;
  onCreate?: () => void;
  createLabel?: string;
}

/**
 * Action toolbar for marketing list surfaces.
 * Title comes from the dashboard navbar — this only renders Export / Create.
 */
export function CampaignHeader({
  breadcrumbs: _breadcrumbs,
  title: _title,
  totalCount: _totalCount,
  onExport,
  exportLabel = "Export",
  onCreate,
  createLabel = "New",
}: CampaignHeaderProps) {
  void _breadcrumbs;
  void _title;
  void _totalCount;

  if (!onExport && !onCreate) return null;

  return (
    <div className="w-full shrink-0 border-b border-slate-200/80 bg-background">
      <div className="flex flex-wrap items-center justify-end gap-1.5 px-1 py-2">
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
  );
}
