"use client";

import Image from "next/image";
import { ChevronLeft, MoreHorizontal, Pencil } from "lucide-react";
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
  return (
    <div className="space-y-3">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {breadcrumb.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i === 0 && <ChevronLeft className="h-4 w-4" />}
            <a
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </a>
            {i < breadcrumb.length - 1 && (
              <span className="text-muted-foreground/50">/</span>
            )}
          </span>
        ))}
      </nav>

      <Panel>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Left side: Avatar, Name, Status, Subtitle, Tags */}
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <div className="relative h-12 w-12 overflow-hidden rounded-full">
                  <Image
                    src={avatarUrl}
                    alt={name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {initials}
                </div>
              )}
              {isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-500" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-foreground">
                  {name}
                </h1>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                    toneClasses(status.tone),
                  )}
                >
                  {status.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {subtitleParts.join(" · ")}
              </p>
              {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag.label}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag.icon && <tag.icon className="h-3 w-3" />}
                      {tag.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right side: Stacked rows for actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Top Row: Primary Action + Quick Actions */}
            <div className="flex items-center gap-2">
              {primaryAction && (
                <button
                  onClick={primaryAction.onClick}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
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
                  onClick={action.onClick}
                  aria-label={action.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shadow-xs"
                >
                  {action.icon && <action.icon className="h-4 w-4" />}
                </button>
              ))}
            </div>

            {/* Bottom Row: Edit Details & More Actions */}
            <div className="flex items-center gap-2">
              {onEditDetails && (
                <button
                  onClick={onEditDetails}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shadow-xs"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Details
                </button>
              )}

              {onMoreActions && (
                <button
                  onClick={onMoreActions}
                  aria-label="More Actions"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shadow-xs"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
