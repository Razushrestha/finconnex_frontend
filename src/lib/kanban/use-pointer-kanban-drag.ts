"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export const KANBAN_DROP_COLUMN_ATTR = "data-kanban-drop-column";
export const KANBAN_CARD_SLOT_ATTR = "data-kanban-card-slot";

const IGNORE_SELECTOR = "input, textarea, select, button, [data-no-drag]";
const DRAG_THRESHOLD_PX = 6;

export type KanbanDragGhost = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PointerKanbanDrop = {
  itemId: string;
  sourceColumnId: string;
  targetColumnId: string;
  targetIndex?: number;
};

export type PointerKanbanOutcomeDrop = {
  itemId: string;
  sourceColumnId: string;
  outcome: "won" | "lost";
};

type PendingDrag = {
  itemId: string;
  columnId: string;
  name: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

type DragInfo = { itemId: string; sourceColumnId: string };

type DropPos = { columnId: string; targetIndex: number };

function hitTest(clientX: number, clientY: number) {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const node of stack) {
    if (!(node instanceof Element)) continue;
    const outcomeEl = node.closest("[data-kanban-outcome]");
    const outcome = outcomeEl?.getAttribute("data-kanban-outcome");
    if (outcome === "won" || outcome === "lost") {
      return { kind: "outcome" as const, outcome: outcome as "won" | "lost" };
    }
    const columnEl = node.closest(`[${KANBAN_DROP_COLUMN_ATTR}]`);
    const columnId = columnEl?.getAttribute(KANBAN_DROP_COLUMN_ATTR);
    if (columnId) {
      return { kind: "column" as const, columnId };
    }
  }
  return null;
}

function insertIndexForColumn(
  columnId: string,
  clientY: number,
  draggedId: string,
) {
  const slots = document.querySelectorAll<HTMLElement>(
    `[${KANBAN_DROP_COLUMN_ATTR}="${columnId}"] [${KANBAN_CARD_SLOT_ATTR}]`,
  );
  let targetIndex = 0;
  for (const slot of slots) {
    if (slot.getAttribute(KANBAN_CARD_SLOT_ATTR) === draggedId) continue;
    const rect = slot.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) break;
    targetIndex += 1;
  }
  return targetIndex;
}

export function usePointerKanbanDrag(options: {
  onDrop: (drop: PointerKanbanDrop) => void;
  onOutcomeDrop?: (drop: PointerKanbanOutcomeDrop) => void;
}) {
  const onDropRef = useRef(options.onDrop);
  const onOutcomeDropRef = useRef(options.onOutcomeDrop);
  onDropRef.current = options.onDrop;
  onOutcomeDropRef.current = options.onOutcomeDrop;

  const pendingRef = useRef<PendingDrag | null>(null);
  const dragRef = useRef<DragInfo | null>(null);
  const dropPosRef = useRef<DropPos | null>(null);
  const ghostOffsetRef = useRef({ x: 0, y: 0 });
  const skipClickRef = useRef(false);

  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [ghost, setGhost] = useState<KanbanDragGhost | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [overOutcome, setOverOutcome] = useState<"won" | "lost" | null>(null);
  const [dropTargetPos, setDropTargetPos] = useState<DropPos | null>(null);

  function clearDrag() {
    pendingRef.current = null;
    dragRef.current = null;
    dropPosRef.current = null;
    setDragInfo(null);
    setGhost(null);
    setOverColumnId(null);
    setOverOutcome(null);
    setDropTargetPos(null);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    window.setTimeout(() => {
      skipClickRef.current = false;
    }, 50);
  }

  const clearDragRef = useRef(clearDrag);
  clearDragRef.current = clearDrag;

  function applyHover(clientX: number, clientY: number) {
    const info = dragRef.current;
    if (!info) return;
    const hit = hitTest(clientX, clientY);
    if (!hit) {
      setOverColumnId(null);
      setOverOutcome(null);
      return;
    }
    if (hit.kind === "outcome") {
      setOverColumnId(null);
      setOverOutcome(hit.outcome);
      return;
    }
    setOverOutcome(null);
    setOverColumnId(hit.columnId);
    const next = {
      columnId: hit.columnId,
      targetIndex: insertIndexForColumn(hit.columnId, clientY, info.itemId),
    };
    dropPosRef.current = next;
    setDropTargetPos(next);
  }

  const applyHoverRef = useRef(applyHover);
  applyHoverRef.current = applyHover;

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const pending = pendingRef.current;
      if (pending && !dragRef.current) {
        const dx = event.clientX - pending.startX;
        const dy = event.clientY - pending.startY;
        if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
        skipClickRef.current = true;
        ghostOffsetRef.current = { x: pending.offsetX, y: pending.offsetY };
        const info = {
          itemId: pending.itemId,
          sourceColumnId: pending.columnId,
        };
        dragRef.current = info;
        setDragInfo(info);
        setGhost({
          name: pending.name,
          x: event.clientX - pending.offsetX,
          y: event.clientY - pending.offsetY,
          width: pending.width,
          height: pending.height,
        });
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }
      if (!dragRef.current) return;
      event.preventDefault();
      const { x: offsetX, y: offsetY } = ghostOffsetRef.current;
      setGhost((prev) =>
        prev
          ? { ...prev, x: event.clientX - offsetX, y: event.clientY - offsetY }
          : prev,
      );
      applyHoverRef.current(event.clientX, event.clientY);
    }

    function onPointerUp(event: PointerEvent) {
      pendingRef.current = null;
      const info = dragRef.current;
      if (!info) return;
      const hit = hitTest(event.clientX, event.clientY);
      if (hit?.kind === "outcome") {
        onOutcomeDropRef.current?.({
          itemId: info.itemId,
          sourceColumnId: info.sourceColumnId,
          outcome: hit.outcome,
        });
        clearDragRef.current();
        return;
      }
      if (hit?.kind === "column") {
        const index =
          dropPosRef.current?.columnId === hit.columnId
            ? dropPosRef.current.targetIndex
            : undefined;
        onDropRef.current({
          itemId: info.itemId,
          sourceColumnId: info.sourceColumnId,
          targetColumnId: hit.columnId,
          targetIndex: index,
        });
        clearDragRef.current();
        return;
      }
      clearDragRef.current();
    }

    function onPointerCancel() {
      pendingRef.current = null;
      if (dragRef.current) clearDragRef.current();
    }

    const moveOpts: AddEventListenerOptions = { capture: true, passive: false };
    const upOpts: AddEventListenerOptions = { capture: true };
    document.addEventListener("pointermove", onPointerMove, moveOpts);
    document.addEventListener("pointerup", onPointerUp, upOpts);
    document.addEventListener("pointercancel", onPointerCancel, upOpts);
    return () => {
      document.removeEventListener("pointermove", onPointerMove, moveOpts);
      document.removeEventListener("pointerup", onPointerUp, upOpts);
      document.removeEventListener("pointercancel", onPointerCancel, upOpts);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, []);

  function onCardPointerDown(
    event: ReactPointerEvent<HTMLElement>,
    item: { id: string; columnId: string; name: string },
  ) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest(IGNORE_SELECTOR)) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    pendingRef.current = {
      itemId: item.id,
      columnId: item.columnId,
      name: item.name,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  function cardPointerProps(item: {
    id: string;
    columnId: string;
    name: string;
  }) {
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) =>
        onCardPointerDown(event, item),
      onDragStart: (event: React.DragEvent) => {
        event.preventDefault();
      },
      onClickCapture: (event: React.MouseEvent) => {
        if (!skipClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
      },
    };
  }

  return {
    dragInfo,
    ghost,
    overColumnId,
    overOutcome,
    dropTargetPos,
    onCardPointerDown,
    cardPointerProps,
    isDragging: Boolean(dragInfo),
    isDraggingItem: (id: string) => dragInfo?.itemId === id,
  };
}
