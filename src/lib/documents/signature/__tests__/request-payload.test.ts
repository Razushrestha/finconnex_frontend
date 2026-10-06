import { describe, expect, it } from "vitest";

import { toCreateSignatureRequestBody } from "@/lib/documents/signature/api";
import { adaptSignatureRequestPayload } from "@/lib/documents/signature/request-payload";
import { makeSigner, type SignatureRequest } from "@/lib/documents/signature/types";

function request(): SignatureRequest {
  const signer = makeSigner({
    id: "sg-1",
    name: "Razu",
    email: "razu@example.com",
    order: 1,
    token: "sig-1",
    phone: "0400000000",
  });
  return {
    id: "sr-1",
    signatureRequestId: "ES-1",
    documentName: "Engagement letter",
    documentFile: "letter.pdf",
    signer: signer.name,
    signerEmail: signer.email,
    signers: [signer],
    fields: [],
    signingOrder: "sequential",
    status: "Draft",
    expiryDate: "21/10/2026",
    createdBy: "Owner",
    manageToken: "sig-1",
    audit: [],
  };
}

describe("toCreateSignatureRequestBody", () => {
  it("sends only the signature-request fields Nest accepts", () => {
    const body = toCreateSignatureRequestBody(
      request(),
      "bf046a80-3952-4937-ab2a-4ad5430685f6",
    );
    expect(body).toEqual({
      documentId: "bf046a80-3952-4937-ab2a-4ad5430685f6",
      title: "Engagement letter",
      signingOrder: "SEQUENTIAL",
      expiresAt: "2026-10-21",
      recipients: [
        {
          name: "Razu",
          email: "razu@example.com",
          role: "SIGNER",
          order: 1,
        },
      ],
    });
    expect(body).not.toHaveProperty("documentName");
    expect(body).not.toHaveProperty("emailSubject");
  });
});

describe("adaptSignatureRequestPayload", () => {
  it("drops rejected properties and keeps a renamed title", () => {
    const next = adaptSignatureRequestPayload(
      JSON.stringify({
        title: "Letter",
        documentName: "Letter",
        emailSubject: "Please sign",
        recipients: [{ name: "Razu", email: "razu@example.com", phone: "0400" }],
      }),
      JSON.stringify({
        message: [
          "property documentName should not exist",
          "property emailSubject should not exist",
          "property title should not exist",
          "recipients.0.property phone should not exist",
        ],
      }),
    );
    expect(JSON.parse(next ?? "{}")).toEqual({
      name: "Letter",
      recipients: [{ name: "Razu", email: "razu@example.com" }],
    });
  });
});
