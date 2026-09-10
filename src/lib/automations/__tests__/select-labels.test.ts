import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Base UI's `Select.Value` renders the *raw value* unless `Select.Root` is
 * given `items` to resolve a label from. That is how an owner select ended up
 * showing "88e825f3-cb83-…" instead of a teammate's name, and the unset
 * sentinel showing as "__unset__".
 *
 * Every `<Select` in the builder must therefore pass `items`. This is checked
 * as source text rather than by rendering because the failure is a missing
 * prop, not behaviour a single render would surface — a select whose value
 * happens to equal its label looks correct right up until one doesn't.
 */
const BUILDER = join(process.cwd(), "src/components/automations/builder");
const FILES = ["ConditionBuilder.tsx", "StepConfigPanel.tsx", "TriggerConfigPanel.tsx"];

describe("builder selects resolve labels", () => {
  it.each(FILES)("%s passes items to every Select root", (file) => {
    const source = readFileSync(join(BUILDER, file), "utf8");
    // `<Select` opening tags only — not SelectTrigger/Content/Item/Value.
    const roots = source.match(/<Select(?![A-Za-z])[\s\S]{0,400}?>/g) ?? [];
    expect(roots.length).toBeGreaterThan(0);
    for (const root of roots) {
      expect(root).toContain("items=");
    }
  });
});
