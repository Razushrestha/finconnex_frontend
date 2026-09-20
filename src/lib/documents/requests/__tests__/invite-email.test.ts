import { describe, expect, it } from "vitest";

import { documentRequestInviteCopy } from "@/lib/documents/requests/invite-email";

describe("documentRequestInviteCopy", () => {
  it("lists requested documents and the upload link", () => {
    const copy = documentRequestInviteCopy({
      clientName: "razu shrestha",
      brokerName: "nepatronix web",
      title: "Property purchase - razu",
      documents: ["Driver licence"],
      provideUrl: "https://app.example.com/provide/token",
      dueDate: "27/09/2026, 05:00 pm",
    });
    expect(copy.subject).toContain("Property purchase - razu");
    expect(copy.text).toContain("Driver licence");
    expect(copy.text).toContain("https://app.example.com/provide/token");
    expect(copy.text).toContain("nepatronix web");
    expect(copy.html).toContain("Upload documents");
    expect(copy.html).toContain("Driver licence");
  });
});
