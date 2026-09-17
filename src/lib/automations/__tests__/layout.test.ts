import { describe, expect, it } from "vitest";

import { buildWorkflowGraph, type TriggerView } from "../layout";
import type { AutomationStep } from "../types";

const trigger = (key: string, triggerType: string): TriggerView => ({
  key,
  triggerType,
});

const action: AutomationStep = {
  key: "notify",
  type: "ACTION",
  action: "WEBHOOK",
  config: {},
};

/** Ids of the nodes an edge list points at, from a given source. */
const targetsOf = (edges: { source: string; target: string }[], source: string) =>
  edges.filter((edge) => edge.source === source).map((edge) => edge.target);

describe("buildWorkflowGraph with multiple triggers", () => {
  it("draws one card per trigger plus the add card, all in one row", () => {
    const { nodes } = buildWorkflowGraph(
      [trigger("a", "LEAD_CREATED"), trigger("b", "LEAD_UPDATED")],
      [action]
    );
    const cards = nodes.filter(
      (node) => node.type === "trigger" || node.type === "addTrigger"
    );
    expect(cards.map((node) => node.type)).toEqual([
      "trigger",
      "trigger",
      "addTrigger",
    ]);
    // A row: same y, strictly increasing x.
    expect(new Set(cards.map((node) => node.position.y))).toEqual(new Set([0]));
    const xs = cards.map((node) => node.position.x);
    expect([...xs].sort((l, r) => l - r)).toEqual(xs);
  });

  it("converges every trigger into the same first step", () => {
    const { nodes, edges } = buildWorkflowGraph(
      [trigger("a", "LEAD_CREATED"), trigger("b", "CONTACT_CREATED")],
      [action]
    );
    const step = nodes.find((node) => node.type === "action");
    expect(step).toBeDefined();
    // Any trigger matching starts the workflow, so they are siblings feeding
    // one column — not a chain.
    expect(targetsOf(edges, "trigger-a")).toEqual([step!.id]);
    expect(targetsOf(edges, "trigger-b")).toEqual([step!.id]);
    expect(targetsOf(edges, "add-trigger")).toEqual([step!.id]);
  });

  it("keeps the step column centred as triggers are added", () => {
    const one = buildWorkflowGraph([trigger("a", "LEAD_CREATED")], [action]);
    const three = buildWorkflowGraph(
      [
        trigger("a", "LEAD_CREATED"),
        trigger("b", "LEAD_UPDATED"),
        trigger("c", "LEAD_LOST"),
      ],
      [action]
    );
    const stepX = (graph: typeof one) =>
      graph.nodes.find((node) => node.type === "action")!.position.x;
    expect(stepX(three)).toBe(stepX(one));
  });

  it("marks triggers removable only when more than one remains", () => {
    const single = buildWorkflowGraph([trigger("a", "LEAD_CREATED")], []);
    const pair = buildWorkflowGraph(
      [trigger("a", "LEAD_CREATED"), trigger("b", "LEAD_UPDATED")],
      []
    );
    const removable = (graph: typeof single) =>
      graph.nodes
        .filter((node) => node.type === "trigger")
        .map((node) => (node.data as { removable: boolean }).removable);
    expect(removable(single)).toEqual([false]);
    expect(removable(pair)).toEqual([true, true]);
  });

  it("still lays out a workflow whose trigger has not been chosen yet", () => {
    const { nodes, edges } = buildWorkflowGraph([trigger("a", "")], []);
    expect(nodes.some((node) => node.type === "end")).toBe(true);
    expect(edges.length).toBeGreaterThan(0);
  });
});
