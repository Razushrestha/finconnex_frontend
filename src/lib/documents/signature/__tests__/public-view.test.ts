import { describe, expect, it } from "vitest";

import { mapPublicSignatureView } from "@/lib/documents/signature/public-view";

describe("mapPublicSignatureView", () => {
  it("keeps editor overlay pixels instead of treating them as fractions", () => {
    const { request } = mapPublicSignatureView("sig-1-test", {
      documentName: "Workshop",
      fields: [
        {
          id: "f1",
          recipientId: "sg-1",
          type: "signature",
          pageNumber: 1,
          x: 62,
          y: 18,
          width: 140,
          height: 36,
        },
      ],
    });
    expect(request.fields[0]?.x).toBe(62);
    expect(request.fields[0]?.y).toBe(18);
    expect(request.fields[0]?.w).toBe(140);
    expect(request.fields[0]?.h).toBe(36);
  });
});
