import { describe, expect, it } from "vitest";

import { toCreateDocumentRequestBody } from "@/lib/documents/requests/api";

function savedDay(dueDate: string): string {
  const body = toCreateDocumentRequestBody({ title: "Pack", dueDate });
  const iso = String(body.dueDate);
  const at = new Date(iso);
  return `${at.getDate()}/${at.getMonth() + 1}/${at.getFullYear()}`;
}

describe("document request due date sent to the CRM", () => {
  it("reads dd/mm/yyyy day-first, so the CRM keeps the day the email shows", () => {
    // `new Date("05/11/2026")` is 11 May; the form means 5 November.
    expect(savedDay("05/11/2026")).toBe("5/11/2026");
    expect(savedDay("14/10/2026")).toBe("14/10/2026");
  });

  it("keeps a datetime-local value on its local day", () => {
    expect(savedDay("2026-11-05T17:00")).toBe("5/11/2026");
  });
});
