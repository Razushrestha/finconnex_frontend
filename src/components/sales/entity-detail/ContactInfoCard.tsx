"use client";

import type { ContactInfoCardProps } from "./types";
import { Panel } from "./shared";

export function ContactInfoCard({
  title = "Contact Info",
  fields,
}: ContactInfoCardProps) {
  return (
    <Panel>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <dl className="mt-3 space-y-3">
        {fields.map((field) => (
          <div key={field.label} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
              <field.icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                {field.label}
              </dt>
              <dd className="truncate text-sm text-foreground font-medium">
                {field.href ? (
                  <a href={field.href} className="text-primary hover:underline">
                    {field.value}
                  </a>
                ) : (
                  field.value
                )}
                {field.helperText && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
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
