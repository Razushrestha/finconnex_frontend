"use client";

import type { ContactInfoCardProps } from "./types";
import { Panel, PanelTitle } from "./shared";

export function ContactInfoCard({
  title = "Contact Info",
  fields,
}: ContactInfoCardProps) {
  return (
    <Panel>
      <PanelTitle>{title}</PanelTitle>
      <dl className="space-y-3.5">
        {fields.map((field) => (
          <div key={field.label} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
              <field.icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold tracking-[0.06em] text-slate-400 uppercase">
                {field.label}
              </dt>
              <dd className="mt-0.5 truncate text-[13px] font-medium text-slate-800">
                {field.href ? (
                  <a
                    href={field.href}
                    className="text-violet-700 transition-colors hover:text-violet-800 hover:underline"
                  >
                    {field.value}
                  </a>
                ) : (
                  field.value
                )}
                {field.helperText && (
                  <span className="ml-1.5 text-[11px] font-normal text-slate-400">
                    {field.helperText}
                  </span>
                )}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
