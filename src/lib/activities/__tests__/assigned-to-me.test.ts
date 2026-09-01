import { afterEach, describe, expect, it } from "vitest";
import {
  isAssignedToCurrentUser,
  isCurrentUserIdentity,
} from "@/lib/activities/assigned-to-me";
import { setRulesActor } from "@/lib/rules/actor";
import { taskMatchesFilters } from "@/lib/tasks/search";
import { callMatchesScope } from "@/lib/calls/store";
import { meetingMatchesScope } from "@/lib/meetings/store";
import type { Task } from "@/lib/tasks/types";

describe("assigned-to-me scopes", () => {
  afterEach(() => {
    setRulesActor({
      name: "John Smith",
      email: "admin@finconnex.com",
      role: "Manager",
      id: "user_john",
    });
  });

  it("treats John Smith as the current demo user by default", () => {
    expect(isCurrentUserIdentity("John Smith")).toBe(true);
    expect(isAssignedToCurrentUser("Tejas Gokhe")).toBe(false);
    expect(isCurrentUserIdentity("John Cena")).toBe(false);
  });

  it("matches organizer emails for the signed-in owner", () => {
    setRulesActor({
      name: "Tejas Gokhe",
      email: "tejas@nepatronix.com",
      role: "Manager",
    });
    expect(isCurrentUserIdentity("Tejas Gokhe")).toBe(true);
    expect(isCurrentUserIdentity("tejas@nepatronix.com")).toBe(true);
    expect(isAssignedToCurrentUser("John Smith")).toBe(false);
  });

  it("filters tasks and calls to the assignee only", () => {
    setRulesActor({ name: "John Smith", email: "admin@finconnex.com", role: "Manager" });
    const mine = { assignedTo: "John Smith" } as Task;
    const theirs = { assignedTo: "Roshna Abraham" } as Task;
    expect(taskMatchesFilters(mine, { statuses: [], priorities: [], types: [], scope: "mine" })).toBe(true);
    expect(taskMatchesFilters(theirs, { statuses: [], priorities: [], types: [], scope: "mine" })).toBe(false);
    expect(callMatchesScope({ assignedTo: "John Smith", status: "Scheduled", date: "01/09/2026" }, "mine")).toBe(true);
    expect(callMatchesScope({ assignedTo: "Tejas Gokhe", status: "Scheduled", date: "01/09/2026" }, "mine")).toBe(false);
  });

  it("treats meeting organizer or attendee as assigned", () => {
    setRulesActor({ name: "John Smith", email: "admin@finconnex.com", role: "Manager" });
    expect(
      meetingMatchesScope(
        {
          organizer: "John Smith",
          attendees: [],
          status: "Scheduled",
          startDateTime: "01/09/2027 10:00 AM",
        },
        "mine",
      ),
    ).toBe(true);
    expect(
      meetingMatchesScope(
        {
          organizer: "tejas@nepatronix.com",
          attendees: [{ id: "1", name: "Roshna Abraham", email: "roshna@example.com" }],
          status: "Scheduled",
          startDateTime: "01/09/2027 10:00 AM",
        },
        "mine",
      ),
    ).toBe(false);
  });
});
