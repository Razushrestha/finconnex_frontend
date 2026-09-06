/**
 * Immutable helpers for editing the step tree at a dotted path produced by
 * `buildWorkflowGraph` (layout.ts) — e.g. "steps.0" (top-level index 0),
 * "steps.0.then.1" (index 1 inside the IF_ELSE at steps[0]'s Then branch).
 * The leading "steps" segment is the array's own name, dropped before
 * walking; segments after that alternate `index` and `"then"|"else"`.
 */
import type { AutomationIfElseStep, AutomationStep } from "./types";

function tokensFor(path: string): string[] {
  const parts = path.split(".");
  return parts[0] === "steps" ? parts.slice(1) : parts;
}

function transformAtPath(
  steps: AutomationStep[],
  tokens: string[],
  transform: (index: number, array: AutomationStep[]) => AutomationStep[]
): AutomationStep[] {
  if (tokens.length <= 1) {
    return transform(Number(tokens[0] ?? 0), steps);
  }
  const idx = Number(tokens[0]);
  const branch = tokens[1] as "then" | "else";
  return steps.map((step, i) => {
    if (i !== idx || step.type !== "IF_ELSE") return step;
    const ifElse = step as AutomationIfElseStep;
    return {
      ...ifElse,
      [branch]: transformAtPath(ifElse[branch] ?? [], tokens.slice(2), transform),
    };
  });
}

/** Inserts `step` at the array index named by the final segment of `path`. */
export function insertStepAtPath(
  steps: AutomationStep[],
  path: string,
  step: AutomationStep
): AutomationStep[] {
  const tokens = tokensFor(path);
  return transformAtPath(steps, tokens, (index, array) => {
    const next = [...array];
    next.splice(index, 0, step);
    return next;
  });
}

/** Removes the step living at `path` (a step's own path, not an insert path). */
export function removeStepAtPath(steps: AutomationStep[], path: string): AutomationStep[] {
  const tokens = tokensFor(path);
  return transformAtPath(steps, tokens, (index, array) => array.filter((_, i) => i !== index));
}

/** Replaces the step at `path` with `updater(current)`. */
export function updateStepAtPath(
  steps: AutomationStep[],
  path: string,
  updater: (current: AutomationStep) => AutomationStep
): AutomationStep[] {
  const tokens = tokensFor(path);
  return transformAtPath(steps, tokens, (index, array) =>
    array.map((s, i) => (i === index ? updater(s) : s))
  );
}

export function getStepAtPath(steps: AutomationStep[], path: string): AutomationStep | undefined {
  const tokens = tokensFor(path);
  let array = steps;
  for (let i = 0; i < tokens.length - 1; i += 2) {
    const idx = Number(tokens[i]);
    const step = array[idx];
    if (!step || step.type !== "IF_ELSE") return undefined;
    array = (step as AutomationIfElseStep)[tokens[i + 1] as "then" | "else"] ?? [];
  }
  return array[Number(tokens[tokens.length - 1])];
}

let uid = 0;
export function generateStepKey(prefix: string): string {
  uid += 1;
  return `${prefix}-${Date.now().toString(36)}-${uid}`;
}
