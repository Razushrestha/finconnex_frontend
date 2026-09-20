import { describe, expect, it } from "vitest";

import { toCreateSignatureTemplateBody } from "@/lib/documents/signature/templates-api";
import {
  makeSigner,
  type SignatureField,
  type SignatureRequest,
} from "@/lib/documents/signature/types";

describe("toCreateSignatureTemplateBody", () => {
  it("matches Nest CreateSignatureTemplateDto shape", () => {
    const signer = makeSigner({
      id: "local-signer-1",
      name: "Client",
      email: "client@example.com",
      role: "Signer",
      roleLabel: "Client",
      order: 1,
      token: "tok",
    });
    const field: SignatureField = {
      id: "f1",
      kind: "signature",
      page: 1,
      x: 0.1,
      y: 0.2,
      w: 0.25,
      h: 0.06,
      signerId: signer.id,
      required: true,
      label: "Sign here",
    };
    const req = {
      id: "sr-1",
      documentName: "Engagement letter",
      signers: [signer],
      fields: [field],
      signingOrder: "sequential",
      recordType: "template",
    } as SignatureRequest;

    const body = toCreateSignatureTemplateBody(
      req,
      "11111111-1111-4111-8111-111111111111",
    );
    expect(body).toMatchObject({
      name: "Engagement letter",
      documentId: "11111111-1111-4111-8111-111111111111",
      signingOrder: "SEQUENTIAL",
      roles: [{ label: "Client", role: "SIGNER" }],
      fields: [
        expect.objectContaining({
          roleIndex: 0,
          type: "SIGNATURE",
          pageNumber: 1,
        }),
      ],
    });
    expect(body).not.toHaveProperty("title");
  });
});
