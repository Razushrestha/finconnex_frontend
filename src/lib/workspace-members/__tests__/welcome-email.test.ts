import { describe, expect, it } from "vitest";

import { memberWelcomeEmailCopy } from "@/lib/workspace-members/welcome-email";

describe("memberWelcomeEmailCopy", () => {
  it("includes credentials, login URL, and a short welcome", () => {
    const copy = memberWelcomeEmailCopy({
      fullName: "Razu Shrestha",
      email: "razu@example.com",
      password: "TempPass1!",
      loginUrl: "https://app.example.com/login",
      workspaceName: "Nepatronix",
    });
    expect(copy.subject).toContain("Nepatronix");
    expect(copy.text).toContain("razu@example.com");
    expect(copy.text).toContain("TempPass1!");
    expect(copy.text).toContain("https://app.example.com/login");
    expect(copy.html).toContain("Sign in");
    expect(copy.html).toContain("choose your own password");
  });
});
