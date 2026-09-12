import type { TaskActionItem } from "@/lib/tasks/types";

export const ACTION_ITEMS_START = "<!--finconnex-action-items-->";
export const ACTION_ITEMS_END = "<!--/finconnex-action-items-->";

function filledItems(items?: TaskActionItem[]): TaskActionItem[] {
  return (items ?? [])
    .map((item) => ({
      ...item,
      text: item.text.trim(),
    }))
    .filter((item) => item.text.length > 0);
}

export function stripActionItemsBlock(description?: string): string {
  const value = description ?? "";
  const start = value.indexOf(ACTION_ITEMS_START);
  const end = value.indexOf(ACTION_ITEMS_END);
  if (start === -1 || end === -1 || end < start) return value.trim();
  return `${value.slice(0, start)}${value.slice(end + ACTION_ITEMS_END.length)}`.trim();
}

export function parseActionItemsBlock(
  description?: string,
): TaskActionItem[] | undefined {
  const value = description ?? "";
  const start = value.indexOf(ACTION_ITEMS_START);
  const end = value.indexOf(ACTION_ITEMS_END);
  if (start === -1 || end === -1 || end < start) return undefined;
  const body = value.slice(start + ACTION_ITEMS_START.length, end);
  const items = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const checked = /^\s*[-*]\s*\[x\]\s+/i.test(line);
      const text = line.replace(/^\s*[-*]\s*\[[ xX]\]\s+/, "").trim();
      return {
        id: `ai-${index}-${text.slice(0, 24)}`,
        text,
        done: checked,
      };
    })
    .filter((item) => item.text.length > 0);
  return items.length ? items : undefined;
}

export function encodeActionItemsInDescription(
  description?: string,
  items?: TaskActionItem[],
): string | undefined {
  const visible = stripActionItemsBlock(description);
  const next = filledItems(items);
  if (!next.length) return visible || undefined;
  const block = [
    ACTION_ITEMS_START,
    ...next.map((item) => `- [${item.done ? "x" : " "}] ${item.text}`),
    ACTION_ITEMS_END,
  ].join("\n");
  return visible ? `${visible}\n\n${block}` : block;
}
