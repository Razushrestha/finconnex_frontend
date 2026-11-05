import { describe, expect, it } from "vitest";

import { parseBrandCookie } from "@/lib/settings/brand-cookie";

describe("parseBrandCookie", () => {
  const raw = encodeURIComponent("ws-1|#1F6FEB|#0EA5E9|solid");

  it("reads the colours and style saved for this workspace", () => {
    expect(parseBrandCookie(raw, "ws-1")).toEqual({
      primary: "#1F6FEB",
      secondary: "#0EA5E9",
      style: "solid",
    });
  });

  it("treats a cookie without a style as a gradient", () => {
    expect(
      parseBrandCookie(encodeURIComponent("ws-1|#1F6FEB|#0EA5E9"), "ws-1")?.style,
    ).toBe("gradient");
  });

  it("ignores another workspace's colours", () => {
    expect(parseBrandCookie(raw, "ws-2")).toBeNull();
  });

  it("ignores a missing or malformed value", () => {
    expect(parseBrandCookie(undefined, "ws-1")).toBeNull();
    expect(parseBrandCookie("ws-1|red|blue", "ws-1")).toBeNull();
    expect(parseBrandCookie(encodeURIComponent("ws-1|#1F6FEB"), "ws-1")).toBeNull();
  });
});
