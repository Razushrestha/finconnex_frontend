"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

const MIN_TABLE = 120;
const MIN_COL = 36;
const MIN_ROW = 22;
const EDGE = 6;

type DragKind = "width" | "height" | "both" | "col" | "row";

interface DragState {
  kind: DragKind;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  index: number;
  startSizes: number[];
  startCols: number[];
  pointerId: number;
}

interface RichEditorTableResizeProps {
  editorRef: RefObject<HTMLDivElement | null>;
  onChange: () => void;
}

export function RichEditorTableResize({
  editorRef,
  onChange,
}: RichEditorTableResizeProps) {
  const [table, setTable] = useState<HTMLTableElement | null>(null);
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(
    null,
  );
  const dragRef = useRef<DragState | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const beginDragRef = useRef<(
    target: HTMLTableElement,
    kind: DragKind,
    index: number,
    event: PointerEvent,
  ) => void>(() => {});
  tableRef.current = table;

  const measure = useCallback(() => {
    const editor = editorRef.current;
    const current = tableRef.current;
    if (!editor || !current || !current.isConnected || !editor.contains(current)) {
      setBox(null);
      if (current && !current.isConnected) setTable(null);
      return;
    }
    const er = editor.getBoundingClientRect();
    const tr = current.getBoundingClientRect();
    setBox({
      left: tr.left - er.left,
      top: tr.top - er.top,
      width: tr.width,
      height: tr.height,
    });
  }, [editorRef]);

  useEffect(() => {
    measure();
  }, [table, measure]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !table) return;
    const onScroll = () => measure();
    editor.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onScroll);
    const ro = new ResizeObserver(onScroll);
    ro.observe(table);
    ro.observe(editor);
    return () => {
      editor.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro.disconnect();
    };
  }, [editorRef, table, measure]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    function borderHit(targetTable: HTMLTableElement, x: number, y: number) {
      const rows = [...targetTable.rows];
      for (const row of rows) {
        for (const cell of [...row.cells]) {
          const r = cell.getBoundingClientRect();
          const inY = y >= r.top - 2 && y <= r.bottom + 2;
          const inX = x >= r.left - 2 && x <= r.right + 2;
          if (inY && Math.abs(x - r.right) <= EDGE) {
            return { kind: "col" as const, index: cell.cellIndex };
          }
          if (inX && Math.abs(y - r.bottom) <= EDGE) {
            return { kind: "row" as const, index: row.rowIndex };
          }
        }
      }
      return null;
    }

    function onMoveCursor(event: PointerEvent) {
      if (dragRef.current) return;
      const targetTable = (event.target as HTMLElement | null)?.closest?.("table");
      if (!targetTable || !editor.contains(targetTable)) {
        if (editor.style.cursor) editor.style.cursor = "";
        return;
      }
      const hit = borderHit(targetTable, event.clientX, event.clientY);
      editor.style.cursor = hit?.kind === "col" ? "col-resize" : hit?.kind === "row" ? "row-resize" : "";
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      const node = event.target as HTMLElement | null;
      if (node?.closest?.("[data-table-resize]")) return;
      const next = node?.closest?.("table");
      if (!next || !editor.contains(next)) {
        setTable(null);
        return;
      }
      setTable(next);
      const hit = borderHit(next, event.clientX, event.clientY);
      if (!hit) return;
      event.preventDefault();
      beginDragRef.current(next, hit.kind, hit.index, event);
    }

    function onDocDown(event: PointerEvent) {
      const node = event.target as HTMLElement | null;
      if (node?.closest?.("[data-table-resize]")) return;
      if (editor.contains(node)) return;
      setTable(null);
    }

    editor.addEventListener("pointerdown", onPointerDown);
    editor.addEventListener("pointermove", onMoveCursor);
    document.addEventListener("pointerdown", onDocDown);
    return () => {
      editor.removeEventListener("pointerdown", onPointerDown);
      editor.removeEventListener("pointermove", onMoveCursor);
      document.removeEventListener("pointerdown", onDocDown);
      if (editor.style.cursor) editor.style.cursor = "";
    };
  }, [editorRef]);

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      const current = tableRef.current;
      if (!drag || !current) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const editor = editorRef.current;
      const pad = editor ? horizontalPadding(editor) : 8;
      const maxW = Math.max(MIN_TABLE, (editor?.clientWidth ?? drag.startW) - pad);

      if (drag.kind === "width" || drag.kind === "both") {
        const nextW = clamp(drag.startW + dx, MIN_TABLE, maxW);
        const ratio = drag.startW > 0 ? nextW / drag.startW : 1;
        current.style.width = `${Math.round(nextW)}px`;
        current.style.maxWidth = "100%";
        if (drag.startCols.length) {
          paintColgroup(
            current,
            drag.startCols.map((width) => Math.max(MIN_COL, width * ratio)),
          );
        }
      }
      if (drag.kind === "height" || drag.kind === "both") {
        const nextH = Math.max(MIN_ROW * Math.max(1, current.rows.length), drag.startH + dy);
        current.style.height = `${Math.round(nextH)}px`;
      }
      if (drag.kind === "col") {
        applyColWidths(current, drag.index, drag.startSizes, dx);
      }
      if (drag.kind === "row") {
        applyRowHeights(current, drag.index, drag.startSizes, dy);
      }
      measure();
    }

    function onPointerUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      onChange();
      measure();
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [editorRef, measure, onChange]);

  function beginDrag(
    target: HTMLTableElement,
    kind: DragKind,
    index: number,
    event: PointerEvent,
  ) {
    ensureTableLayout(target);
    const rect = target.getBoundingClientRect();
    const cols = columnWidths(target);
    dragRef.current = {
      kind,
      startX: event.clientX,
      startY: event.clientY,
      startW: rect.width,
      startH: rect.height,
      index,
      startSizes: kind === "col" ? cols : kind === "row" ? rowHeights(target) : [],
      startCols: cols,
      pointerId: event.pointerId,
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor =
      kind === "col" || kind === "width"
        ? "col-resize"
        : kind === "row" || kind === "height"
          ? "row-resize"
          : "nwse-resize";
    setTable(target);
  }
  beginDragRef.current = beginDrag;

  if (!table || !box) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <div
        className="absolute"
        style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      >
        <div className="absolute inset-0 ring-2 ring-[#5A32A3]" />
        <Handle
          kind="width"
          className="absolute top-0 right-0 h-full w-2 cursor-ew-resize"
          onPointerDown={(event) => beginDrag(table, "width", 0, event)}
        />
        <Handle
          kind="height"
          className="absolute bottom-0 left-0 h-2 w-full cursor-ns-resize"
          onPointerDown={(event) => beginDrag(table, "height", 0, event)}
        />
        <Handle
          kind="both"
          className="absolute right-0 bottom-0 h-3.5 w-3.5 cursor-nwse-resize rounded-[2px] border-2 border-[#5A32A3] bg-white"
          onPointerDown={(event) => beginDrag(table, "both", 0, event)}
        />
      </div>
    </div>
  );
}

function Handle({
  kind,
  className,
  onPointerDown,
}: {
  kind: DragKind;
  className: string;
  onPointerDown: (event: PointerEvent) => void;
}) {
  return (
    <div
      data-table-resize={kind}
      className={`pointer-events-auto ${className}`}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onPointerDown(event.nativeEvent);
      }}
    />
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function ensureTableLayout(table: HTMLTableElement) {
  table.style.tableLayout = "fixed";
  table.style.maxWidth = "100%";
  table.style.width = `${Math.round(table.getBoundingClientRect().width)}px`;
}

function horizontalPadding(editor: HTMLElement) {
  const style = window.getComputedStyle(editor);
  return (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
}

function columnWidths(table: HTMLTableElement) {
  const first = table.rows[0];
  if (!first) return [];
  return [...first.cells].map((cell) => cell.getBoundingClientRect().width);
}

function rowHeights(table: HTMLTableElement) {
  return [...table.rows].map((row) => row.getBoundingClientRect().height);
}

function applyColWidths(table: HTMLTableElement, index: number, start: number[], dx: number) {
  const cols = Math.max(start.length, table.rows[0]?.cells.length ?? 0);
  if (!cols) return;
  const next = start.map((width, i) => {
    if (i === index) return Math.max(MIN_COL, width + dx);
    if (i === index + 1) return Math.max(MIN_COL, width - dx);
    return width;
  });
  if (index === cols - 1) {
    next[index] = Math.max(MIN_COL, (start[index] ?? MIN_COL) + dx);
    const total = next.reduce((sum, width) => sum + width, 0);
    table.style.width = `${Math.round(total)}px`;
  }
  paintColgroup(table, next);
}

function applyRowHeights(table: HTMLTableElement, index: number, start: number[], dy: number) {
  const next = start.map((height, i) =>
    i === index ? Math.max(MIN_ROW, height + dy) : height,
  );
  [...table.rows].forEach((row, i) => {
    const height = next[i];
    if (height) row.style.height = `${Math.round(height)}px`;
  });
  table.style.height = `${Math.round(next.reduce((sum, height) => sum + height, 0))}px`;
}

function paintColgroup(table: HTMLTableElement, widths: number[]) {
  let group = table.querySelector("colgroup");
  if (!group) {
    group = document.createElement("colgroup");
    table.insertBefore(group, table.firstChild);
  }
  while (group.children.length < widths.length) {
    group.appendChild(document.createElement("col"));
  }
  while (group.children.length > widths.length) {
    group.lastElementChild?.remove();
  }
  widths.forEach((width, i) => {
    const col = group!.children[i] as HTMLElement;
    col.style.width = `${Math.round(width)}px`;
  });
}
