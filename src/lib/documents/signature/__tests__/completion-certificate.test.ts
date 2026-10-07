import { describe, expect, it } from "vitest";

import {
  completionCertificateFromRequest,
  formatCertificateStamp,
} from "@/lib/documents/signature/completion-certificate";
import { makeSigner, type SignatureRequest } from "@/lib/documents/signature/types";

function request(partial: Partial<SignatureRequest> = {}): SignatureRequest {
  const signer = makeSigner({
    id: "sg-1",
    name: "nepatronix web",
    email: "web@example.com",
    order: 1,
    token: "sig-1-17",
    status: "Signed",
    signedAt: "2026-06-09T18:15:00.000Z",
  });
  return {
    id: "public-sig-1-17",
    signatureRequestId: "PUB-sig-1-17",
    documentName: "NepaTronix_Quotation.pdf",
    documentFile: "NepaTronix_Quotation.pdf",
    signer: signer.name,
    signerEmail: signer.email,
    signers: [signer],
    fields: [],
    signingOrder: "sequential",
    status: "Signed",
    createdBy: "",
    manageToken: signer.token,
    expiryDate: "",
    audit: [],
    ...partial,
  };
}

describe("completionCertificateFromRequest", () => {
  it("fills send, email, view, and terms from the signature when those times were not stored", () => {
    const cert = completionCertificateFromRequest(request());
    const signed = formatCertificateStamp("2026-06-09T18:15:00.000Z");
    expect(cert.sentOn).toBe(signed);
    expect(cert.signers[0]?.emailedAt).toBe(signed);
    expect(cert.signers[0]?.viewedAt).toBe(signed);
    expect(cert.signers[0]?.termsAgreedAt).toBe(signed);
    expect(cert.signers[0]?.signedAt).toBe(signed);
  });

  it("keeps the real send, open, and agreement times", () => {
    const signer = makeSigner({
      id: "sg-1",
      name: "nepatronix web",
      email: "web@example.com",
      order: 1,
      token: "sig-1-17",
      status: "Signed",
      emailedAt: "2026-06-09T01:00:00.000Z",
      viewedAt: "2026-06-09T02:00:00.000Z",
      termsAgreedAt: "2026-06-09T02:05:00.000Z",
      signedAt: "2026-06-09T18:15:00.000Z",
    });
    const cert = completionCertificateFromRequest(
      request({
        sentAt: "2026-06-09T01:00:00.000Z",
        signers: [signer],
        audit: [
          {
            id: "a1",
            at: "2026-06-09T01:00:00.000Z",
            action: "Sent for signature · 1 signer(s)",
            actor: "Mohit",
          },
        ],
      }),
    );
    expect(cert.sentOn).toBe(formatCertificateStamp("2026-06-09T01:00:00.000Z"));
    expect(cert.signers[0]?.emailedAt).toBe(
      formatCertificateStamp("2026-06-09T01:00:00.000Z"),
    );
    expect(cert.signers[0]?.viewedAt).toBe(
      formatCertificateStamp("2026-06-09T02:00:00.000Z"),
    );
    expect(cert.signers[0]?.termsAgreedAt).toBe(
      formatCertificateStamp("2026-06-09T02:05:00.000Z"),
    );
    expect(cert.signers[0]?.signedAt).toBe(
      formatCertificateStamp("2026-06-09T18:15:00.000Z"),
    );
  });
});
