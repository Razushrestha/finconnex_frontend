import type {
  SignatureRequest,
  SignatureSigner,
} from "@/lib/documents/signature/types";

/** Absolute URL a recipient would land on after clicking "Start Signing" in the email/SMS. */
export function getSigningLink(token: string): string {
  if (typeof window === "undefined") return `/sign/${token}`;
  return `${window.location.origin}/sign/${token}`;
}

/**
 * Diffs signer status before/after markRequestSent() to find whoever just
 * transitioned to "Sent" — i.e. who a real email/SMS would go out to right now.
 * (For sequential signing this is usually just the next signer in line;
 * for parallel it's everyone who isn't already Signed/Declined.)
 */
export function getNewlyNotifiedSigners(
  before: SignatureRequest,
  after: SignatureRequest,
): SignatureSigner[] {
  return after.signers.filter((s) => {
    const prev = before.signers.find((b) => b.id === s.id);
    return prev?.status !== "Sent" && s.status === "Sent";
  });
}
