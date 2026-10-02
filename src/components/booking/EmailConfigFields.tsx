"use client";

import { useId, type ReactNode } from "react";
import { ListboxSelect } from "@/components/booking/LimitsControls";
import {
  ccOptions,
  replyToOptions,
  sendFromOptions,
  type EmailAudience,
  type EmailRouting,
} from "@/lib/booking/email-config";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="mb-1.5 block text-[12px] text-slate-500">{label}</span>
      {children}
    </div>
  );
}

/**
 * Send from / Reply To / Copy(Cc) for one audience of the Email panel. The
 * options differ by audience: only emails that go to the team can reply to the
 * customer.
 */
export function EmailConfigFields({
  audience,
  value,
  superAdminEmail,
  onChange,
}: {
  audience: EmailAudience;
  value: EmailRouting;
  superAdminEmail: string;
  onChange: (partial: Partial<EmailRouting>) => void;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="mt-8">
      <h3 id={headingId} className="text-[13px] font-semibold text-slate-800">
        Email Configurations
      </h3>
      <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <Field label="Send from">
          <ListboxSelect
            label="Send from"
            value={value.sendFrom}
            options={sendFromOptions(superAdminEmail)}
            onChange={(sendFrom) => onChange({ sendFrom })}
          />
        </Field>
        <Field label="Reply To">
          <ListboxSelect
            label="Reply To"
            value={value.replyTo}
            options={replyToOptions(audience, superAdminEmail)}
            onChange={(replyTo) => onChange({ replyTo })}
          />
        </Field>
        <Field label="Copy(Cc)">
          <ListboxSelect
            label="Copy (Cc)"
            value={value.cc}
            options={ccOptions(superAdminEmail)}
            onChange={(cc) => onChange({ cc })}
          />
        </Field>
      </div>
      <p className="mt-2.5 text-[12px] text-slate-500">
        Reply To and Cc are added to every email in this tab. Messages are
        delivered by your workspace mail server.
      </p>
    </section>
  );
}
