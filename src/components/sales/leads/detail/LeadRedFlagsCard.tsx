"use client";

import { Flag } from "lucide-react";
import type { LeadCardData } from "@/lib/leads/types";
import { LEAD_FIELD_KEYS } from "@/lib/leads/detail-snapshot";
import {
  readLeadFactFindValue,
  type ApplicantRole,
} from "@/lib/leads/fact-find-bridge";
import {
  dependantCount as factFindDependantCount,
  hasThreeYearResidence,
  monthsSince,
  parseEmployments,
} from "@/lib/portals/mortgage";

type CriticalFlag = {
  id: string;
  label: string;
  applicant: string;
};

function answersFor(card: LeadCardData, role: ApplicantRole) {
  const ids = [
    "employmentType",
    "employer",
    "occupation",
    "startDate",
    "employmentsJson",
    "incomesJson",
    "moveInDate",
    "previousAddress",
    "previousMoveIn",
    "dependants",
    "residency",
    "licenceExpiry",
    "workArrangement",
  ];
  return Object.fromEntries(
    ids.map((id) => [id, readLeadFactFindValue(card, id, role)]),
  );
}

function applicantDisplayName(
  card: LeadCardData,
  role: ApplicantRole,
  fallback: string,
) {
  const first = readLeadFactFindValue(card, "firstName", role);
  const middle = readLeadFactFindValue(card, "middleName", role);
  const last = readLeadFactFindValue(card, "lastName", role);
  return [first, middle, last].filter(Boolean).join(" ") || fallback;
}

function collectApplicantFlags(
  card: LeadCardData,
  role: ApplicantRole,
  applicant: string,
): CriticalFlag[] {
  const flags: CriticalFlag[] = [];
  const push = (label: string) => {
    flags.push({ id: `${role}:${label}`, label, applicant });
  };
  const answers = answersFor(card, role);

  const expiry = answers.licenceExpiry;
  if (expiry) {
    const date = Date.parse(expiry);
    if (Number.isFinite(date)) {
      const days = Math.round(
        (date - new Date().setHours(0, 0, 0, 0)) / 86_400_000,
      );
      if (days < 0) push("ID Expired");
      else if (days <= 60) push("Expiring Soon (30-60 days)");
    }
  }

  if (answers.residency.trim().toLowerCase() === "temporary resident") {
    push("Temporary Resident");
  }

  const jobs = parseEmployments(answers.employmentsJson);
  const employment = (
    answers.employmentType ||
    jobs[0]?.type ||
    ""
  ).toLowerCase();
  if (employment === "unemployed") {
    push("Currently Unemployed");
  } else {
    const started = answers.startDate || jobs[0]?.startDate || "";
    const months = monthsSince(started);
    if (months != null && months < 12) {
      push("Current employment < 1 Year");
    }
  }
  const hasCasual = jobs.some(
    (job) => job.workArrangement.trim().toLowerCase() === "casual",
  );
  if (hasCasual || answers.workArrangement.trim().toLowerCase() === "casual") {
    push("Casual job");
  }

  if (factFindDependantCount({ dependants: answers.dependants }) >= 3) {
    push("Dependants 3 or more");
  }

  if (
    (answers.moveInDate.trim() || answers.previousAddress.trim()) &&
    !hasThreeYearResidence(answers)
  ) {
    push("Address History < 3 Years");
  }

  return flags;
}

export function collectLeadCriticalFlags(card: LeadCardData): CriticalFlag[] {
  const hasSecondary = card.custom?.[LEAD_FIELD_KEYS.secondaryApplicant] === "Yes";
  const primaryName = applicantDisplayName(card, "primary", card.name);
  const secondaryName = applicantDisplayName(
    card,
    "secondary",
    "Secondary applicant",
  );
  return [
    ...collectApplicantFlags(card, "primary", primaryName),
    ...(hasSecondary
      ? collectApplicantFlags(card, "secondary", secondaryName)
      : []),
  ];
}

export function LeadRedFlagsCard({ card }: { card: LeadCardData }) {
  const flags = collectLeadCriticalFlags(card);
  const showApplicant =
    card.custom?.[LEAD_FIELD_KEYS.secondaryApplicant] === "Yes";

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-[0.07em] text-slate-400 uppercase">
          Red Flags
        </p>
        <span
          className={
            flags.length > 0
              ? "flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white"
              : "text-[12px] font-semibold text-slate-400"
          }
        >
          {flags.length}
        </span>
      </div>
      {flags.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-slate-400">
          No critical flags
        </p>
      ) : (
        <ul className="space-y-3">
          {flags.map((flag) => (
            <li key={flag.id} className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <Flag className="h-3.5 w-3.5 fill-rose-600" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-slate-800">
                  {flag.label}
                </p>
                {showApplicant ? (
                  <p className="text-[11px] text-slate-400">{flag.applicant}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
