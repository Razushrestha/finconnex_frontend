import { describe, expect, it } from "vitest";

import { documentRequestInviteCopy } from "@/lib/documents/requests/invite-email";
import { emailBrandFromSettings } from "@/lib/emails/brand-mail";

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
    expect(copy.html).toContain("Open secure document portal");
    expect(copy.html).toContain("DOCUMENTS REQUESTED");
    expect(copy.html).toContain("#5A32A3");
    expect(copy.html).toContain("FinconneX");
    expect(copy.html).toContain("Driver licence");
    expect(copy.html).toContain("https://app.example.com/provide/token");
    expect(copy.html.startsWith("<div")).toBe(true);
  });

  it("uses the workspace primary and secondary colours as a gradient", () => {
    const copy = documentRequestInviteCopy({
      clientName: "Mohit Chapagain",
      brokerName: "SmartDocs Demo",
      title: "First Home Buyer",
      documents: ["Driving Licence"],
      provideUrl: "https://app.example.com/provide/token",
      brand: {
        primary: "#2563EB",
        secondary: "#059669",
        gradient: true,
        appName: "FinConnex",
      },
    });
    expect(copy.html).toContain("linear-gradient(135deg,#2563EB 0%,#059669 100%)");
    expect(copy.html).toContain("#2563EB");
  });

  it("reads the saved primary and secondary colours", () => {
    const brand = emailBrandFromSettings({
      primaryColor: "#2563EB",
      secondaryColor: "#059669",
      catalog: { "organization/branding": {} },
    });
    expect(brand.primary).toBe("#2563EB");
    expect(brand.secondary).toBe("#059669");
    expect(brand.gradient).toBe(true);
  });
});
