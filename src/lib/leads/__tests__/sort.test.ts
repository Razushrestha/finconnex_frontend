import { describe, expect, it } from "vitest";
import { compareLeadCards, sortLeadCards } from "@/lib/leads/sort";

const cards = [
  { name: "Zara Khan", createdDate: "2026-01-01" },
  { name: "Alex Chen", createdDate: "2026-09-01" },
  { name: "morgan lee", createdDate: "2026-03-15" },
];

describe("sortLeadCards", () => {
  it("keeps original order when sort is unset", () => {
    expect(sortLeadCards(cards, "Sort").map((c) => c.name)).toEqual([
      "Zara Khan",
      "Alex Chen",
      "morgan lee",
    ]);
  });

  it("orders by name A-Z ignoring case", () => {
    expect(sortLeadCards(cards, "name_asc").map((c) => c.name)).toEqual([
      "Alex Chen",
      "morgan lee",
      "Zara Khan",
    ]);
  });

  it("orders by name Z-A", () => {
    expect(sortLeadCards(cards, "name_desc").map((c) => c.name)).toEqual([
      "Zara Khan",
      "morgan lee",
      "Alex Chen",
    ]);
  });

  it("orders newest first by created date", () => {
    expect(sortLeadCards(cards, "newest").map((c) => c.name)).toEqual([
      "Alex Chen",
      "morgan lee",
      "Zara Khan",
    ]);
  });
});

describe("compareLeadCards", () => {
  it("returns 0 for an unknown sort key", () => {
    expect(compareLeadCards(cards[0], cards[1], "owner")).toBe(0);
  });
});
