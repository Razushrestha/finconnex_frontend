export function findActiveMention(text: string, cursor: number) {
  const before = text.slice(0, cursor);
  const match = before.match(/(?:^|[\s\n])@([\w\s.'-]*)$/);
  if (!match) return null;
  const query = match[1];
  const start = cursor - query.length - 1;
  return { query, start };
}

export function getTextBeforeCaret(container: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.endContainer, range.endOffset);

  return {
    textBefore: preRange.toString(),
    range,
    selection,
  };
}

export function getCaretRect(container: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return container.getBoundingClientRect();
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.width || rect.height) return rect;

  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  range.insertNode(marker);
  const markerRect = marker.getBoundingClientRect();
  marker.remove();
  selection.removeAllRanges();
  selection.addRange(range);
  return markerRect;
}
