import { describe, expect, it } from "vitest";

import { parsePublicSignerStatus } from "@/lib/documents/signature/sync-public-status";
import {
  completionPercent,
  makeSigner,
  type SignatureRequest,
} from "@/lib/documents/signature/types";

function stubRequest(
  status: SignatureRequest["signers"][number]["status"],
): SignatureRequest {
  const signer = makeSigner({
    id: "sg-1",
    name: "Razu",
    email: "razu@example.com",
    order: 1,
    token: "sig-1-test",
    status,
  });
  return {
    id: "sr-1",
    signatureRequestId: "ES-1",
    documentName: "Doc",
    documentFile: "doc.pdf",
    signer: signer.name,
    signerEmail: signer.email,
    signers: [signer],
    fields: [],
    signingOrder: "parallel",
    status: "Sent",
    createdBy: "Owner",
    manageToken: "sig-1-test",
    audit: [],
  };
}

describe("parsePublicSignerStatus", () => {
  it("maps viewed and signed without treating Sent as signed", () => {
    expect(parsePublicSignerStatus("Sent")).toBe("Sent");
    expect(parsePublicSignerStatus("Viewed")).toBe("Viewed");
    expect(parsePublicSignerStatus("Signed")).toBe("Signed");
    expect(parsePublicSignerStatus("Declined")).toBe("Declined");
  });
});

describe("completionPercent", () => {
  it("rises from mailed to viewed to signed", () => {
    expect(completionPercent(stubRequest("Sent"))).toBe(33);
    expect(completionPercent(stubRequest("Viewed"))).toBe(67);
    expect(completionPercent(stubRequest("Signed"))).toBe(100);
  });
});
