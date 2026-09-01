import { describe, expect, it } from "vitest";
import {
  nextBestWhenLabel,
  pickNextBestAction,
  type NextBestActionInput,
} from "@/lib/leads/next-best-action";

function row(
  partial: Omit<NextBestActionInput, "createdAt" | "actionable" | "priority"> &
    Partial<Pick<NextBestActionInput, "createdAt" | "actionable" | "priority">>,
): NextBestActionInput {
  return {
    priority: "normal",
    createdAt: partial.at,
    actionable: true,
    ...partial,
  };
}

describe("pickNextBestAction", () => {
  it("picks the longest-overdue activity, not the highest priority", () => {
    const now = new Date(2026, 8, 1, 9, 45);
    const next = pickNextBestAction(
      [
        row({
          id: "call",
          at: new Date(2026, 8, 1, 10, 0),
          priority: "high",
        }),
        row({
          id: "email",
          at: new Date(2026, 7, 30, 14, 0),
          priority: "high",
        }),
        row({
          id: "docs",
          at: new Date(2026, 7, 28, 9, 0),
          priority: "normal",
        }),
      ],
      now,
    );
    expect(next?.id).toBe("docs");
    expect(nextBestWhenLabel(next!.at, now)).toBe("Overdue by 4 days");
  });

  it("never selects completed, cancelled, or deleted activities", () => {
    const now = new Date(2026, 8, 1, 9, 45);
    const next = pickNextBestAction(
      [
        row({
          id: "done",
          at: new Date(2026, 7, 20, 9, 0),
          actionable: false,
        }),
        row({
          id: "today",
          at: new Date(2026, 8, 1, 14, 0),
        }),
      ],
      now,
    );
    expect(next?.id).toBe("today");
  });

  it("does not mark a later-today activity as overdue", () => {
    const now = new Date(2026, 8, 1, 9, 45);
    const next = pickNextBestAction(
      [
        row({
          id: "follow-up",
          at: new Date(2026, 8, 1, 10, 0),
          priority: "high",
        }),
        row({
          id: "fact-find",
          at: new Date(2026, 8, 1, 14, 0),
        }),
      ],
      now,
    );
    expect(next?.id).toBe("follow-up");
    expect(nextBestWhenLabel(next!.at, now)).toBe("Due today, 10:00 am");
  });

  it("falls through today → tomorrow → upcoming → empty", () => {
    const now = new Date(2026, 8, 1, 16, 0);
    expect(
      pickNextBestAction(
        [row({ id: "tomorrow", at: new Date(2026, 8, 2, 11, 0) })],
        now,
      )?.id,
    ).toBe("tomorrow");
    expect(
      pickNextBestAction(
        [row({ id: "later", at: new Date(2026, 8, 4, 16, 0) })],
        now,
      )?.id,
    ).toBe("later");
    expect(pickNextBestAction([], now)).toBeNull();
  });

  it("breaks same due time with High then oldest created", () => {
    const now = new Date(2026, 8, 1, 9, 0);
    const due = new Date(2026, 8, 1, 10, 0);
    const next = pickNextBestAction(
      [
        row({
          id: "normal-older",
          at: due,
          priority: "normal",
          createdAt: new Date(2026, 7, 20, 9, 0),
        }),
        row({
          id: "high-newer",
          at: due,
          priority: "high",
          createdAt: new Date(2026, 7, 25, 9, 0),
        }),
      ],
      now,
    );
    expect(next?.id).toBe("high-newer");

    const oldest = pickNextBestAction(
      [
        row({
          id: "first",
          at: due,
          priority: "high",
          createdAt: new Date(2026, 7, 20, 9, 0),
        }),
        row({
          id: "second",
          at: due,
          priority: "high",
          createdAt: new Date(2026, 7, 21, 9, 0),
        }),
      ],
      now,
    );
    expect(oldest?.id).toBe("first");
  });
});
