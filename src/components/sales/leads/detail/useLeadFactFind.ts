"use client";

import { useCallback, useRef } from "react";
import type { LeadCardData } from "@/lib/leads/types";
import {
  readLeadFactFindValue,
  writeLeadFactFindKeys,
  type ApplicantRole,
} from "@/lib/leads/fact-find-bridge";

export type LeadFactFindPatch = {
  name?: string;
  email?: string;
  phone?: string;
  estimatedValue?: string;
  custom?: Record<string, string>;
};

export type { ApplicantRole };
export { readLeadFactFindValue };

export function useLeadFactFind(
  card: LeadCardData,
  onLeadPatch?: (patch: LeadFactFindPatch) => void,
  role: ApplicantRole = "primary",
) {
  const queue = useRef<LeadFactFindPatch>({});
  const scheduled = useRef(false);

  const flush = useCallback(() => {
    scheduled.current = false;
    const patch = queue.current;
    queue.current = {};
    if (
      !patch.custom &&
      patch.name === undefined &&
      patch.email === undefined &&
      patch.phone === undefined &&
      patch.estimatedValue === undefined
    ) {
      return;
    }
    onLeadPatch?.(patch);
  }, [onLeadPatch]);

  const enqueue = useCallback(
    (patch: LeadFactFindPatch) => {
      queue.current = {
        ...queue.current,
        ...patch,
        custom: { ...queue.current.custom, ...patch.custom },
      };
      if (!scheduled.current) {
        scheduled.current = true;
        queueMicrotask(flush);
      }
    },
    [flush],
  );

  const valueOf = useCallback(
    (id: string) => readLeadFactFindValue(card, id, role),
    [card, role],
  );

  const onChange = useCallback(
    (id: string, value: string) => {
      const patch: LeadFactFindPatch = {
        custom: writeLeadFactFindKeys(id, value, role),
      };
      if (role === "primary" && (id === "mobile" || id === "phone")) {
        patch.phone = value;
      }
      if (role === "primary" && id === "desiredLoanAmount") {
        patch.estimatedValue = value;
      }
      if (
        role === "primary" &&
        (id === "firstName" || id === "middleName" || id === "lastName")
      ) {
        const first =
          id === "firstName" ? value : readLeadFactFindValue(card, "firstName", role);
        const middle =
          id === "middleName"
            ? value
            : readLeadFactFindValue(card, "middleName", role);
        const last =
          id === "lastName" ? value : readLeadFactFindValue(card, "lastName", role);
        patch.name = [first, middle, last].filter(Boolean).join(" ");
      }
      enqueue(patch);
    },
    [card, enqueue, role],
  );

  return { valueOf, onChange, disabled: false as const };
}
