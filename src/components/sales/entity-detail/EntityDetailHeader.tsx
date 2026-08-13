"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, MoreHorizontal, Pencil } from "lucide-react";
import type { EntityDetailHeaderProps } from "./types";
import { Panel, cn, toneClasses } from "./shared";

export function EntityDetailHeader({
  breadcrumb,
  avatarUrl,
  initials,
  isOnline,
  name,
  subtitleParts,
  status,
  tags = [],
  primaryAction,
  quickActions = [],
  onEditDetails,
  onMoreActions,
}: EntityDetailHeaderProps) {
  const crumbs = breadcrumb.filter((crumb) => crumb.label !== "Home");

  return (
    <div className="space-y-3">
      {crumbs.length > 1 ? (
      <nav className="flex flex-wrap items-center gap-1 text-[12px] text-slate-400">
        {crumbs.map((crumb, i) => (
          <span key={`${crumb.href}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
            {i < crumbs.length - 1 ? (
              <Link
                href={crumb.href}
                className="font-medium text-slate-500 transition-colors hover:text-violet-700"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-slate-700">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      ) : null}

      <Panel className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <div className="relative h-14 w-14 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                  <Image
                    src={avatarUrl}
                    alt={name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-[15px] font-semibold tracking-tight text-violet-700 ring-1 ring-violet-100">
                  {initials}
                </div>
              )}
              {isOnline && (
                <span
                  className="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500"
                  title="Online"
                />
              )}
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[20px] font-semibold tracking-tight text-slate-900">
                  {name}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                    toneClasses(status.tone),
                  )}
                >
                  {status.label}
                </span>
              </div>

              {subtitleParts.length > 0 && (
                <p className="truncate text-[13px] text-slate-500">
                  {subtitleParts.join(" · ")}
                </p>
              )}

              {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {tags.map((tag) => (
                    <span
                      key={tag.label}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      {tag.icon && <tag.icon className="h-3 w-3 text-slate-400" />}
                      {tag.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-violet-600/20 transition-colors hover:bg-violet-700"
              >
                {primaryAction.icon && (
                  <primaryAction.icon className="h-4 w-4" />
                )}
                {primaryAction.label}
              </button>
            )}

            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                aria-label={action.label}
                title={action.label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
              >
                {action.icon && <action.icon className="h-4 w-4" />}
              </button>
            ))}

            {onEditDetails && (
              <button
                type="button"
                onClick={onEditDetails}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Details
              </button>
            )}

            {onMoreActions && (
              <button
                type="button"
                onClick={onMoreActions}
                aria-label="More actions"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
