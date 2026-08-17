import type {
  SignatureRequest,
  SignatureSigner,
} from "@/lib/documents/signature/types";
import { getSigningLink } from "@/lib/documents/signature/mock-send";

export interface SignatureEmailPayload {
  to: string;
  signerName: string;
  documentName: string;
  senderName: string;
  signingLink: string;
  expiryDate: string;
}

/**
 * Stands in for the real email/SMS call. Every send flow in the app should
 * go through this function (not fetch/console.log directly) — that way,
 * once you have a real provider, this is the ONLY place you touch.
 */
export async function notifySigner(
  payload: SignatureEmailPayload,
): Promise<void> {
  console.log(`[mock email] → ${payload.to}`);
  console.table(payload);

  // TODO: swap this body for the real call once the API is ready, e.g.:
  //
  // await fetch("/api/notifications/signature-request", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(payload),
  // });
}

/** Notifies a batch of signers (e.g. whoever just moved to "Sent" status). */
export async function notifySigners(
  request: SignatureRequest,
  signers: SignatureSigner[],
): Promise<void> {
  await Promise.all(
    signers.map((signer) =>
      notifySigner({
        to: signer.email,
        signerName: signer.name,
        documentName: request.documentName,
        senderName: request.createdBy,
        signingLink: getSigningLink(signer.token),
        expiryDate: request.expiryDate,
      }),
    ),
  );
}
