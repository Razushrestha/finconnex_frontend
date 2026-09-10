import { describe, expect, it } from "vitest";
import {
  encodeActionItemsInDescription,
  parseActionItemsBlock,
  stripActionItemsBlock,
} from "@/lib/tasks/action-items";
import { normalizeTask } from "@/lib/tasks/api";

const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("task action items", () => {
  it("round-trips checklist text through the description block", () => {
    const encoded = encodeActionItemsInDescription("Follow up", [
      { id: "1", text: "Call Ramesh", done: false },
      { id: "2", text: "Send pack", done: true },
    ]);
    expect(stripActionItemsBlock(encoded)).toBe("Follow up");
    expect(parseActionItemsBlock(encoded)?.map((item) => item.text)).toEqual([
      "Call Ramesh",
      "Send pack",
    ]);
    expect(parseActionItemsBlock(encoded)?.[1]?.done).toBe(true);
  });

  it("normalizes encoded action items off the CRM description", () => {
    const description = encodeActionItemsInDescription("test test", [
      { id: "1", text: "Prep the pack", done: false },
    ]);
    const task = normalizeTask(
      {
        id: ID,
        subject: "test test test",
        status: "NOT_STARTED",
        description,
      },
      0,
    );
    expect(task.description).toBe("test test");
    expect(task.actionItems).toEqual([
      { id: expect.any(String), text: "Prep the pack", done: false },
    ]);
  });
});
