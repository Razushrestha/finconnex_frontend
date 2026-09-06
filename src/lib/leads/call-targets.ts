import type { LeadCardData } from "@/lib/leads/types";
import { leadApplicants } from "@/lib/leads/detail-snapshot";
import { openSoftphoneNear } from "@/lib/softphone/events";

export type LeadCallTarget = {
  id: "primary" | "secondary";
  name: string;
  phone: string;
  role: "Primary" | "Secondary";
};

export function leadCallTargets(card: LeadCardData): LeadCallTarget[] {
  return leadApplicants(card).map((applicant, index) => {
    const phone =
      index === 0
        ? (
            card.phone ||
            card.mobilePhone ||
            card.custom?.mobile ||
            ""
          ).trim()
        : (
            card.custom?.["secondary.mobile"] ||
            card.custom?.["secondary.phone"] ||
            ""
          ).trim();
    return {
      id: index === 0 ? "primary" : "secondary",
      name: applicant.name,
      phone,
      role: applicant.role,
    };
  });
}

export function startLeadApplicantCall(
  card: LeadCardData,
  target: LeadCallTarget,
  anchor?: HTMLElement | null,
): { ok: true } | { ok: false; message: string } {
  const phone = target.phone.trim();
  if (!phone) {
    return {
      ok: false,
      message: `${target.name} has no phone number.`,
    };
  }
  openSoftphoneNear(anchor ?? null, {
    phone,
    name: target.name,
    relatedTo: `Lead: ${card.name}`,
    autoStart: true,
  });
  return { ok: true };
}
