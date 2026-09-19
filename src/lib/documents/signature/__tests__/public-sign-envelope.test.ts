import { describe, expect, it } from "vitest";

import {
  isPackedPublicSignToken,
  openPublicSignSession,
  sealPublicSignSession,
} from "@/lib/documents/signature/public-sign-envelope";

describe("public sign envelope", () => {
  it("round-trips session metadata used on Vercel signing links", () => {
    const sealed = sealPublicSignSession({
      documentName: "Workshop",
      recipientName: "Nepatronix",
      role: "Signer",
      status: "Sent",
      fileToken: "sig-1-test",
      fields: [{ id: "f1", type: "signature", x: 10, y: 20 }],
    });
    expect(isPackedPublicSignToken(sealed)).toBe(true);
    const opened = openPublicSignSession(sealed);
    expect(opened?.documentName).toBe("Workshop");
    expect(opened?.fileToken).toBe("sig-1-test");
    expect(opened?.fields).toHaveLength(1);
  });

  it("rejects a tampered payload", () => {
    const sealed = sealPublicSignSession({ documentName: "A" });
    const parts = sealed.split(".");
    const bad = `${parts[0]}.${parts[1]}xxxx.${parts[2]}`;
    expect(openPublicSignSession(bad)).toBeNull();
  });
});
