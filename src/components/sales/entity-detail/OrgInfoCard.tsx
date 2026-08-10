"use client";

import Image from "next/image";
import { Building2 } from "lucide-react";
import type { OrgInfoCardProps } from "./types";
import { Panel, PanelTitle } from "./shared";

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
        <PanelTitle>Company</PanelTitle>

        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-slate-200">
              <Image src={logoUrl} alt={name} fill className="object-cover" />
            </div>
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
              <Building2 className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-slate-900">
              {name}
            </p>
            {domain &&
              (domainHref ? (
                <a
                  href={domainHref}
                  className="block truncate text-[12px] text-violet-700 hover:underline"
                >
                  {domain}
                </a>
              ) : (
                <p className="truncate text-[12px] text-slate-400">{domain}</p>
              ))}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-100 pt-3">
          {fields.map((field) => (
            <div key={field.label} className="min-w-0">
              <dt className="text-[10px] font-semibold tracking-[0.06em] text-slate-400 uppercase">
                {field.label}
              </dt>
              <dd className="mt-0.5 truncate text-[13px] font-semibold text-slate-800">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Panel>
  );
}
