import { beforeEach, describe, expect, it } from "vitest";

import { deleteLead, listLeadColumns, mergeRemoteLeadColumns, saveLeadColumns } from "@/lib/leads/store";
import { LEAD_COLUMNS, type LeadCardData } from "@/lib/leads/types";

const LEAD_ID = "e344de3b-efe2-4800-919e-9693d204e80f";

function card(): LeadCardData {
  return {
    id: LEAD_ID,
    name: "Binayak Karki",
    initials: "BK",
    company: "",
    email: "lead@example.com",
    phone: "",
    owner: "Owner",
    createdDate: "17/09/2026",
    source: "Website",
    accentColorClass: "bg-violet-500",
    avatarBgClass: "bg-violet-500",
    pipelineStage: "New Lead",
  };
}

function emptyBoard() {
  return LEAD_COLUMNS.map((col) => ({ ...col, cards: [], leadCount: 0 }));
}

function boardWithLead() {
  return LEAD_COLUMNS.map((col, index) =>
    index === 0 ? { ...col, cards: [card()], leadCount: 1 } : { ...col, cards: [], leadCount: 0 },
  );
}

const cardIds = () => listLeadColumns().flatMap((col) => col.cards.map((c) => c.id));

describe("lead board backup", () => {
  // The backup lives in localStorage, which Node lacks; without this the
  // backup branch never runs and the bug cannot show.
  beforeEach(() => {
    const data = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => void data.set(key, String(value)),
        removeItem: (key: string) => void data.delete(key),
        clear: () => data.clear(),
      },
    });
  });

  it("does not bring back the last lead once the CRM no longer returns it", () => {
    saveLeadColumns(boardWithLead());
    expect(cardIds()).toEqual([LEAD_ID]);

    // The refresh after a delete: the CRM returns an empty board.
    saveLeadColumns(mergeRemoteLeadColumns(emptyBoard()));

    expect(cardIds()).toEqual([]);
  });

  it("does not bring back the last lead deleted locally", () => {
    saveLeadColumns(boardWithLead());
    deleteLead(LEAD_ID);
    expect(cardIds()).toEqual([]);
  });
});
