import { describe, expect, it, vi } from "vitest";
import { startLeadApplicantCall } from "@/lib/leads/call-targets";
import type { LeadCardData } from "@/lib/leads/types";

vi.mock("@/lib/softphone/events", () => ({
  openSoftphoneNear: vi.fn(),
}));

const card = {
  id: "lead-1",
  name: "John Doe",
  phone: "xyzabc",
} as LeadCardData;

describe("startLeadApplicantCall", () => {
  it("does not open the softphone for an invalid number", async () => {
    const { openSoftphoneNear } = await import("@/lib/softphone/events");
    const result = startLeadApplicantCall(
      card,
      { id: "primary", name: "John Doe", phone: "xyzabc", role: "Primary" },
      null,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/E\.164/);
    }
    expect(openSoftphoneNear).not.toHaveBeenCalled();
  });
});
