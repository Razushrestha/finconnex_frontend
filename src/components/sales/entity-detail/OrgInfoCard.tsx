"use client";

import Image from "next/image";
import { Building2 } from "lucide-react";
import type { OrgInfoCardProps } from "./types";
import { Panel } from "./shared";

/**
 * Company/org summary panel. Reused as-is on a Deal detail page — a deal
 * belongs to the same company its source lead did.
 */
export function OrgInfoCard({
  name,
  domain,
  domainHref,
  logoUrl,
  mapImageUrl,
  mapHref,
  fields,
}: OrgInfoCardProps) {
  return (
    <Panel padded={false} className="overflow-hidden">
      {mapImageUrl && (
        <a href={mapHref} className="relative block h-28 w-full">
          <Image
            src={mapImageUrl}
            alt={`Map near ${name}`}
            fill
            className="object-cover"
          />
        </a>
      )}

      <div className="p-4">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-border">
              <Image src={logoUrl} alt={name} fill className="object-cover" />
            </div>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
              <Building2 className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              {name}
            </p>
            {domain &&
              (domainHref ? (
                <a
                  href={domainHref}
                  className="truncate text-xs text-primary hover:underline block"
                >
                  {domain}
                </a>
              ) : (
                <p className="truncate text-xs text-muted-foreground">
                  {domain}
                </p>
              ))}
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
          {fields.map((field) => (
            <div key={field.label} className="min-w-0">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {field.label}
              </dt>
              <dd className="truncate text-sm font-medium text-foreground">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Panel>
  );
}
