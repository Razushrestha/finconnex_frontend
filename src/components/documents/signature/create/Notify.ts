import type {
  SignatureRequest,
  SignatureSigner,
} from "@/lib/documents/signature/types";
import { getSigningLink } from "@/lib/documents/signature/mock-send";
import { sendEmailDemoLive } from "@/lib/comms/send-gateway";

export interface SignatureEmailPayload {
  to: string;
  signerName: string;
  documentName: string;
  senderName: string;
  signingLink: string;
  expiryDate: string;
  files?: File[];
}

function invitationBody(payload: SignatureEmailPayload) {
  const expiry = payload.expiryDate?.trim()
    ? `\nThis request expires on ${payload.expiryDate}.`
    : "";
  return [
    `Hello ${payload.signerName || "there"},`,
    "",
    `${payload.senderName || "A teammate"} sent “${payload.documentName}” for your signature.`,
    "Their details are already filled in on the document. Open the link below to review it and complete your fields.",
    "",
    payload.signingLink,
    expiry,
  ].join("\n");
}

export async function notifySigner(
  payload: SignatureEmailPayload,
): Promise<void> {
  if (!payload.to.trim()) return;
  const result = await sendEmailDemoLive({
    email: payload.to.trim(),
    subject: `Please sign: ${payload.documentName}`,
    body: invitationBody(payload),
    relatedType: "signature-request",
    files: payload.files,
  });
  if (!result.ok) {
    throw new Error(result.message || "Could not email the signer");
  }
}

export async function notifySigners(
  request: SignatureRequest,
  signers: SignatureSigner[],
  files?: File[],
): Promise<void> {
  const actionable = signers.filter(
    (signer) => signer.role !== "CC" && signer.email.trim(),
  );
  const errors: string[] = [];
  for (const signer of actionable) {
    try {
      await notifySigner({
        to: signer.email,
        signerName: signer.name,
        documentName: request.documentName,
        senderName: request.createdBy,
        signingLink: getSigningLink(signer.token),
        expiryDate: request.expiryDate,
        files,
      });
    } catch (err) {
      errors.push(
        err instanceof Error ? err.message : `Could not email ${signer.email}`,
      );
    }
  }
  if (errors.length && errors.length === actionable.length) {
    throw new Error(errors[0]);
  }
}
