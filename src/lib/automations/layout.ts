/**
 * Pure layout: turns an `AutomationStep[]` tree (as executed by the backend
 * planner — see automation-planner.service.ts) into React Flow nodes/edges
 * laid out as a vertical flowchart, matching the reference product's canvas:
 * a straight line down for sequential steps, an IF_ELSE step fanning out
 * into two side-by-side "Then"/"Else" columns that reconverge into whatever
 * follows the branch at the parent level.
 *
 * This does NOT use a graph layout library — the shape is always a strict
 * tree (never an arbitrary graph), so direct recursive placement is exact
 * and avoids pulling in dagre/elk for something this constrained. Instead of
 * a synthetic "merge" node, reconvergence is just multiple edges: whatever
 * gets drawn next simply accepts an edge from every dangling tail above it.
 */
import type { Edge, Node } from "@xyflow/react";

import type { AutomationStep, AutomationTriggerStats } from "./types";

export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 84;
export const V_GAP = 88;
export const BRANCH_H_GAP = 48;
/** A trigger card is taller than a step: header + filter summary + footer. */
export const TRIGGER_NODE_HEIGHT = 132;
/** Gap between trigger cards in the row, and before the "add" card. */
export const TRIGGER_H_GAP = 32;

/** One trigger card as the canvas needs to draw it. */
export type TriggerView = {
  key: string;
  triggerType: string | null;
  /** "Any lead" / "leads matching 2 conditions" — the card's filter line. */
  scopeSummary?: string;
  stats?: AutomationTriggerStats;
};

export type BuilderNodeData =
  | { kind: "trigger"; index: number; trigger: TriggerView; removable: boolean }
  | { kind: "addTrigger" }
  | { kind: "step"; step: AutomationStep; path: string }
  | { kind: "add"; path: string; branch?: "then" | "else" }
  | { kind: "end" };

export type BuilderNode = Node<BuilderNodeData & Record<string, unknown>>;

interface Column {
  nodes: BuilderNode[];
  edges: Edge[];
  /** Total horizontal footprint of this column (for sizing branch offsets). */
  width: number;
  /** y just below the last thing placed in this column. */
  nextY: number;
  /** Dangling node id(s) whatever comes next should connect from. */
  tails: string[];
}

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

function mkEdge(source: string, target: string, dashed = false): Edge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    type: "smoothstep",
    style: dashed
      ? { strokeDasharray: "4 4", stroke: "#cbd5e1" }
      : { stroke: "#cbd5e1" },
  };
}

function layoutColumn(
  steps: AutomationStep[],
  path: string,
  centerX: number,
  startY: number,
  incomingTails: string[]
): Column {
  const nodes: BuilderNode[] = [];
  const edges: Edge[] = [];
  let y = startY;
  let tails = incomingTails;
  let width = NODE_WIDTH;

  steps.forEach((step, index) => {
    const stepPath = `${path}.${index}`;

    if (step.type === "IF_ELSE") {
      const id = nextId("step");
      nodes.push({
        id,
        type: "ifElse",
        position: { x: centerX - NODE_WIDTH / 2, y },
        data: { kind: "step", step, path: stepPath },
        draggable: false,
      });
      for (const t of tails) edges.push(mkEdge(t, id));

      const branchY = y + NODE_HEIGHT + V_GAP;
      const thenCenterX = centerX - (NODE_WIDTH + BRANCH_H_GAP) / 2;
      const elseCenterX = centerX + (NODE_WIDTH + BRANCH_H_GAP) / 2;

      const thenLabelId = nextId("label");
      nodes.push({
        id: thenLabelId,
        type: "branchLabel",
        position: { x: thenCenterX - NODE_WIDTH / 2, y: y + NODE_HEIGHT + 16 },
        data: { kind: "add", path: `${stepPath}.then`, branch: "then" },
        draggable: false,
      });
      edges.push(mkEdge(id, thenLabelId));

      const elseLabelId = nextId("label");
      nodes.push({
        id: elseLabelId,
        type: "branchLabel",
        position: { x: elseCenterX - NODE_WIDTH / 2, y: y + NODE_HEIGHT + 16 },
        data: { kind: "add", path: `${stepPath}.else`, branch: "else" },
        draggable: false,
      });
      edges.push(mkEdge(id, elseLabelId));

      const thenCol = layoutColumn(
        step.then ?? [],
        `${stepPath}.then`,
        thenCenterX,
        branchY + 48,
        [thenLabelId]
      );
      const elseCol = layoutColumn(
        step.else ?? [],
        `${stepPath}.else`,
        elseCenterX,
        branchY + 48,
        [elseLabelId]
      );
      nodes.push(...thenCol.nodes, ...elseCol.nodes);
      edges.push(...thenCol.edges, ...elseCol.edges);

      width = Math.max(width, thenCol.width + elseCol.width + BRANCH_H_GAP);
      y = Math.max(thenCol.nextY, elseCol.nextY);
      tails = [...thenCol.tails, ...elseCol.tails];
      return;
    }

    const type =
      step.type === "WAIT_FOR_DURATION" || step.type === "WAIT_UNTIL_DATE"
        ? "wait"
        : "action";
    const id = nextId("step");
    nodes.push({
      id,
      type,
      position: { x: centerX - NODE_WIDTH / 2, y },
      data: { kind: "step", step, path: stepPath },
      draggable: false,
    });
    for (const t of tails) edges.push(mkEdge(t, id));
    tails = [id];
    y += NODE_HEIGHT + V_GAP;
  });

  const addId = nextId("add");
  nodes.push({
    id: addId,
    type: "addStep",
    position: { x: centerX - NODE_WIDTH / 2, y },
    data: { kind: "add", path: `${path}.${steps.length}` },
    draggable: false,
  });
  for (const t of tails) edges.push(mkEdge(t, addId, true));

  return { nodes, edges, width, nextY: y + NODE_HEIGHT + V_GAP, tails: [addId] };
}

/**
 * Lays the workflow out: a row of trigger cards across the top, an "add
 * trigger" card at its right end, and every one of them feeding the single
 * column of steps below. Any trigger matching starts the workflow, so they
 * are siblings that converge rather than a chain — which on the canvas is
 * just several edges into the same first node, the same way branch tails
 * reconverge in `layoutColumn`.
 *
 * The row is centred on x=0 so the step column below stays put as triggers
 * are added and removed, instead of the whole flow shifting sideways.
 */
export function buildWorkflowGraph(
  triggers: TriggerView[],
  steps: AutomationStep[]
): { nodes: BuilderNode[]; edges: Edge[] } {
  counter = 0;
  const centerX = 0;
  const nodes: BuilderNode[] = [];

  // Cards across the top: every trigger, then the dashed "add" card.
  const cardCount = triggers.length + 1;
  const rowWidth = cardCount * NODE_WIDTH + (cardCount - 1) * TRIGGER_H_GAP;
  const rowLeft = centerX - rowWidth / 2;
  const cardX = (slot: number) => rowLeft + slot * (NODE_WIDTH + TRIGGER_H_GAP);

  const triggerIds: string[] = [];
  triggers.forEach((trigger, index) => {
    const id = `trigger-${trigger.key}`;
    triggerIds.push(id);
    nodes.push({
      id,
      type: "trigger",
      position: { x: cardX(index), y: 0 },
      data: {
        kind: "trigger",
        index,
        trigger,
        // The last trigger can't be removed: a workflow with none has no way
        // to start, and the backend rejects it as `triggersRequired`.
        removable: triggers.length > 1,
      },
      draggable: false,
    });
  });

  const addTriggerId = "add-trigger";
  nodes.push({
    id: addTriggerId,
    type: "addTrigger",
    position: { x: cardX(triggers.length), y: 0 },
    data: { kind: "addTrigger" },
    draggable: false,
  });

  const body = layoutColumn(
    steps,
    "steps",
    centerX,
    TRIGGER_NODE_HEIGHT + V_GAP,
    // The add card joins the merge too, so the canvas reads as one funnel
    // rather than a card floating unconnected beside the flow.
    [...triggerIds, addTriggerId]
  );
  nodes.push(...body.nodes);
  const edges = [...body.edges];

  const endId = "end";
  nodes.push({
    id: endId,
    type: "end",
    position: { x: centerX - NODE_WIDTH / 2, y: body.nextY - V_GAP },
    data: { kind: "end" },
    draggable: false,
  });
  for (const t of body.tails) edges.push(mkEdge(t, endId));

  return { nodes, edges };
}
