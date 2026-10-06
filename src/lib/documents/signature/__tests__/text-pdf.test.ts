import { describe, expect, it } from "vitest";
import { textPdfFile } from "@/lib/documents/signature/text-pdf";

describe("textPdfFile", () => {
  it("builds a pdf the signature form can attach", async () => {
    const file = textPdfFile("Home loan", ["Home loan", "Purchase pack"]);
    expect(file.name).toBe("Home loan.pdf");
    expect(file.type).toBe("application/pdf");
    expect(await file.text()).toContain("%PDF-1.4");
  });
});
