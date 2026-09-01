"use client";

import { Plus, Trash2 } from "lucide-react";
import type { LeadCardData } from "@/lib/leads/types";
import { LEAD_FIELD_KEYS } from "@/lib/leads/detail-snapshot";
import { AddressHistoryForm } from "@/components/portals/public/mortgage/PortalFactFindClient";
import { LeadApplicantDetailsFields } from "@/components/sales/leads/detail/LeadApplicantDetailsFields";
import {
  useLeadFactFind,
  type ApplicantRole,
  type LeadFactFindPatch,
} from "@/components/sales/leads/detail/useLeadFactFind";
import { cn } from "@/lib/utils";

function custom(card: LeadCardData, key: string, fallback = "") {
  const value = card.custom?.[key];
  return value !== undefined ? value : fallback;
}

export function LeadDetailsPanel({
  card,
  onLeadPatch,
}: {
  card: LeadCardData;
  onLeadPatch?: (patch: LeadFactFindPatch) => void;
}) {
  const hasSecondary = custom(card, LEAD_FIELD_KEYS.secondaryApplicant) === "Yes";

  function saveCustom(key: string, next: string) {
    onLeadPatch?.({ custom: { [key]: next } });
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5">
        {hasSecondary ? null : (
          <div className="mb-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => saveCustom(LEAD_FIELD_KEYS.secondaryApplicant, "Yes")}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#5A32A3] px-3 text-[12px] font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add applicant
            </button>
          </div>
        )}
        <div
          className={cn(
            hasSecondary
              ? "grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-0"
              : "max-w-[640px]",
          )}
        >
          <ApplicantFactFind
            role="primary"
            label={hasSecondary ? "Primary applicant" : undefined}
            card={card}
            onLeadPatch={onLeadPatch}
          />
          {hasSecondary ? (
            <div className="border-t border-slate-200 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-[0.07em] text-[#5A32A3] uppercase">
                  Secondary applicant
                </p>
                <button
                  type="button"
                  onClick={() => saveCustom(LEAD_FIELD_KEYS.secondaryApplicant, "")}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-600"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
              <ApplicantFactFind
                role="secondary"
                card={card}
                onLeadPatch={onLeadPatch}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ApplicantFactFind({
  role,
  label,
  card,
  onLeadPatch,
}: {
  role: ApplicantRole;
  label?: string;
  card: LeadCardData;
  onLeadPatch?: (patch: LeadFactFindPatch) => void;
}) {
  const { valueOf, onChange, disabled } = useLeadFactFind(
    card,
    onLeadPatch,
    role,
  );
  const emailKey = role === "primary" ? "email" : "secondary.email";
  const email =
    role === "primary" ? card.email || custom(card, "email") : custom(card, emailKey);

  return (
    <div>
      {label ? (
        <p className="mb-3 text-[11px] font-semibold tracking-[0.07em] text-[#5A32A3] uppercase">
          {label}
        </p>
      ) : null}
      <LeadApplicantDetailsFields
        valueOf={valueOf}
        disabled={disabled}
        onChange={onChange}
        email={email}
        onEmailChange={(next) => {
          if (role === "primary") {
            onLeadPatch?.({ email: next, custom: { email: next } });
          } else {
            onLeadPatch?.({ custom: { [emailKey]: next } });
          }
        }}
      />
        <AddressHistoryForm
          valueOf={valueOf}
          disabled={disabled}
          showErrors={false}
          fieldsRequired={false}
          onChange={onChange}
        />
    </div>
  );
}
