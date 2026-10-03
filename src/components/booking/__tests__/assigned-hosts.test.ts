import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssignedHosts } from "@/components/booking/AssignedHosts";
import {
  assignedCalendarMembers,
  clampLoadPercent,
  evenConsultantLoads,
  type BookingPage,
} from "@/lib/booking/types";

const ASSIGNED = ["Mohit Chapagain", "nepatronix web", "spare nepatronix"];

function render(names: string[]) {
  return renderToStaticMarkup(createElement(AssignedHosts, { names }));
}

function rows(html: string) {
  return [...html.matchAll(/<li\b[^>]*>(.*?)<\/li>/g)].map((match) => match[1]!);
}

describe("AssignedHosts", () => {
  it("shows every assigned user, each with their initials", () => {
    const list = rows(render(ASSIGNED));

    expect(list).toHaveLength(3);
    expect(list[0]).toContain("Mohit Chapagain");
    expect(list[0]).toContain(">MC<");
    expect(list[1]).toContain("nepatronix web");
    expect(list[1]).toContain(">NW<");
    expect(list[2]).toContain("spare nepatronix");
    expect(list[2]).toContain(">SN<");
  });

  it("keeps the assigned order", () => {
    const html = render(ASSIGNED);
    expect(html.indexOf("Mohit Chapagain")).toBeLessThan(html.indexOf("nepatronix web"));
    expect(html.indexOf("nepatronix web")).toBeLessThan(html.indexOf("spare nepatronix"));
  });

  it("renders a single assignee as one row", () => {
    const list = rows(render(["Mohit Chapagain"]));
    expect(list).toHaveLength(1);
    expect(list[0]).toContain("Mohit Chapagain");
  });

  it("falls back to a generic host when nobody is assigned", () => {
    const list = rows(render([]));
    expect(list).toHaveLength(1);
    expect(list[0]).toContain("Host");
  });

  it("gives each user a name that can truncate instead of overflowing the panel", () => {
    const html = render(["A very long assigned user name that would overflow the narrow left panel"]);
    expect(html).toContain('class="truncate"');
  });
});

describe("assigned users on the public booking page", () => {
  const page = (overrides: Partial<BookingPage>) =>
    ({ owner: "Ada Host", consultants: [], ...overrides }) as BookingPage;

  it("lists all of an event type's assigned users, not just the first", () => {
    expect(assignedCalendarMembers(page({ consultants: ASSIGNED }))).toEqual(ASSIGNED);
  });

  it("lists a user once even if assigned twice, and skips blanks", () => {
    expect(
      assignedCalendarMembers(page({ consultants: ["Ada", "", "Ada", "Lin"] })),
    ).toEqual(["Ada", "Lin"]);
  });

  it("falls back to the owner when nobody is assigned", () => {
    expect(assignedCalendarMembers(page({ consultants: [] }))).toEqual(["Ada Host"]);
    expect(assignedCalendarMembers(page({ consultants: undefined }))).toEqual(["Ada Host"]);
  });

  it("uses the full list on both panels of the public page", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/components/booking/PublicBookClient.tsx"),
      "utf8",
    );
    // Date/time step and details step each show the assigned-users list.
    expect(source.match(/<AssignedHosts names=\{hostNames\} \/>/g)).toHaveLength(2);
    expect(source).toContain("assignedCalendarMembers(page)");
    // The old single-host row is gone.
    expect(source).not.toContain("page.consultants?.[0]");
  });
});

describe("load-based shares", () => {
  it("gives a single user 100%", () => {
    expect(evenConsultantLoads(["Ada"])).toEqual({ Ada: 100 });
  });

  it("splits two users 50/50 and three users 34/33/33", () => {
    expect(evenConsultantLoads(["Ada", "Lin"])).toEqual({ Ada: 50, Lin: 50 });
    expect(evenConsultantLoads(["Ada", "Lin", "Mo"])).toEqual({
      Ada: 34,
      Lin: 33,
      Mo: 33,
    });
  });

  it("clamps typed percents to 0–100", () => {
    expect(clampLoadPercent("70")).toBe(70);
    expect(clampLoadPercent("150")).toBe(100);
    expect(clampLoadPercent("-4")).toBe(0);
    expect(clampLoadPercent("nope")).toBe(0);
  });
});
