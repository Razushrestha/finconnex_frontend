"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  clampColumnWidth,
  COLUMN_WIDTHS_RESET_EVENT,
  readColumnWidths,
  writeColumnWidths,
} from "@/lib/list-columns/widths";
import {
  readColumnOrder,
  readHiddenColumnIds,
  writeColumnOrder,
  writeHiddenColumnIds,
} from "@/lib/list-columns/visibility";
import { TableDisplayOptionsMenu } from "@/components/common/TableDisplayOptionsMenu";
import {
  ManageColumnsModal,
  type ManageColumn,
} from "@/components/work-queue/ManageColumnsModal";

function splitOverflowClass(className?: string) {
  const overflow: string[] = [];
  const rest: string[] = [];
  for (const token of (className ?? "").split(/\s+/)) {
    if (!token) continue;
    if (
      token.startsWith("overflow") ||
      token.startsWith("overscroll") ||
      token.startsWith("[scrollbar") ||
      token.startsWith("[&::-webkit-scrollbar")
    ) {
      overflow.push(token);
    } else {
      rest.push(token);
    }
  }
  return {
    outer: rest.join(" "),
    inner: overflow.join(" "),
    hasOverflow: overflow.length > 0,
  };
}

function columnId(th: HTMLTableCellElement, index: number) {
  const explicit = th.dataset.colId?.trim();
  if (explicit) return explicit;
  const label = (th.innerText || th.textContent || "")
    .replace(/[↑↓]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return label || `col-${index}`;
}

function columnLabel(th: HTMLTableCellElement, index: number) {
  return (
    (th.innerText || th.textContent || "")
      .replace(/[↑↓]/g, "")
      .replace(/\s+/g, " ")
      .trim() || `Column ${index + 1}`
  );
}

function isChromeColumn(id: string) {
  return id === "options" || id === "select";
}

function applyBox(
  el: HTMLTableCellElement,
  width: number,
  chrome: boolean,
) {
  el.style.width = `${width}px`;
  el.style.minWidth = `${width}px`;
  el.style.maxWidth = chrome ? "none" : `${width}px`;
  el.style.boxSizing = "border-box";
}

function syncColgroup(table: HTMLTableElement, widths: number[]) {
  let colgroup = table.querySelector(":scope > colgroup");
  if (!colgroup) {
    colgroup = document.createElement("colgroup");
    table.insertBefore(colgroup, table.firstChild);
  }
  const cols = Array.from(colgroup.children) as HTMLElement[];
  while (cols.length < widths.length) {
    const col = document.createElement("col");
    colgroup.appendChild(col);
    cols.push(col);
  }
  while (cols.length > widths.length) {
    cols.pop()?.remove();
  }
  widths.forEach((width, index) => {
    const col = cols[index];
    if (!col) return;
    if (width <= 0) {
      col.style.display = "none";
      col.style.width = "0px";
      return;
    }
    col.style.display = "";
    col.style.width = `${width}px`;
    col.style.minWidth = `${width}px`;
  });
}

function applyColumnOrder(table: HTMLTableElement, order: string[]) {
  if (!order.length) return;
  const headRow = table.querySelector("thead tr");
  if (!headRow) return;
  const ths = Array.from(headRow.children) as HTMLTableCellElement[];
  const indexed = ths.map((th, index) => ({ th, id: columnId(th, index), index }));
  const leading = indexed.filter((item) => item.id === "select");
  const trailing = indexed.filter((item) => item.id === "options");
  const middle = indexed.filter(
    (item) => item.id !== "select" && item.id !== "options",
  );
  const byId = new Map(middle.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const orderedMiddle: typeof middle = [];
  for (const id of order) {
    const item = byId.get(id);
    if (!item || seen.has(id)) continue;
    seen.add(id);
    orderedMiddle.push(item);
  }
  for (const item of middle) {
    if (!seen.has(item.id)) orderedMiddle.push(item);
  }
  const next = [...leading, ...orderedMiddle, ...trailing];
  const currentIds = indexed.map((item) => item.id).join("\0");
  const nextIds = next.map((item) => item.id).join("\0");
  if (currentIds === nextIds) return;

  const indexMap = next.map((item) => item.index);
  const rows = [headRow, ...Array.from(table.querySelectorAll("tbody tr"))];
  for (const row of rows) {
    const cells = Array.from(row.children);
    if (cells.length < indexMap.length) continue;
    for (const fromIndex of indexMap) {
      const cell = cells[fromIndex];
      if (cell) row.appendChild(cell);
    }
  }
}

type Edge = {
  id: string;
  label: string;
  x: number;
  headerHeight: number;
};

export function ResizableColumns({
  storageKey,
  children,
  minWidth = 64,
  className,
  pageSize,
  onPageSizeChange,
  onManageColumns,
  pageSizeOptions,
}: {
  storageKey: string;
  children: ReactNode;
  minWidth?: number;
  className?: string;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  onManageColumns?: () => void;
  pageSizeOptions?: number[];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const widthsRef = useRef<Record<string, number>>({});
  const hiddenRef = useRef<Set<string>>(new Set());
  const orderRef = useRef<string[]>([]);
  const hydratedKeyRef = useRef<string | null>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [guideX, setGuideX] = useState<number | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [genericColumns, setGenericColumns] = useState<ManageColumn[]>([]);

  const usesGenericManage = !onManageColumns;

  const discoverColumns = useCallback((): ManageColumn[] => {
    const table = wrapRef.current?.querySelector("table");
    if (!table) return [];
    const ths = Array.from(
      table.querySelectorAll("thead th"),
    ) as HTMLTableCellElement[];
    const hidden = hiddenRef.current;
    const cols: ManageColumn[] = [];
    for (const [index, th] of ths.entries()) {
      const id = columnId(th, index);
      if (isChromeColumn(id)) continue;
      const raw = (th.innerText || th.textContent || "").replace(/[↑↓]/g, "").trim();
      if (!raw) continue;
      const label = columnLabel(th, index);
      cols.push({
        id,
        label,
        checked: !hidden.has(id),
        required: cols.length === 0,
      });
    }
    return cols;
  }, []);

  const applyHidden = useCallback(() => {
    const table = wrapRef.current?.querySelector("table");
    if (!table) return;
    const ths = Array.from(
      table.querySelectorAll("thead th"),
    ) as HTMLTableCellElement[];
    const hidden = usesGenericManage ? hiddenRef.current : new Set<string>();
    const hideAt = ths.map((th, index) => {
      const id = columnId(th, index);
      return hidden.has(id) && !isChromeColumn(id);
    });
    ths.forEach((th, index) => {
      th.style.display = hideAt[index] ? "none" : "";
    });
    table.querySelectorAll("tbody tr").forEach((row) => {
      Array.from(row.children).forEach((cell, index) => {
        if (!(cell instanceof HTMLTableCellElement)) return;
        if (index >= hideAt.length) return;
        cell.style.display = hideAt[index] ? "none" : "";
      });
    });
  }, [usesGenericManage]);

  const applyWidths = useCallback(() => {
    const wrap = wrapRef.current;
    const table = wrap?.querySelector("table");
    if (!wrap || !table) return;
    if (usesGenericManage) applyColumnOrder(table, orderRef.current);

    const ths = Array.from(
      table.querySelectorAll("thead th"),
    ) as HTMLTableCellElement[];
    if (!ths.length) return;

    applyHidden();

    for (const [index, th] of ths.entries()) {
      const id = columnId(th, index);
      if (ths[index].style.display === "none") continue;
      if (widthsRef.current[id] != null) continue;
      const natural = th.getBoundingClientRect().width;
      widthsRef.current[id] = clampColumnWidth(
        natural > 8 ? natural : 120,
        minWidth,
      );
    }

    table.style.tableLayout = "fixed";
    const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
    const planned: { id: string; chrome: boolean; hidden: boolean; width: number }[] =
      ths.map((th, index) => {
        const id = columnId(th, index);
        const hidden = th.style.display === "none";
        const chrome = isChromeColumn(id);
        const width = hidden
          ? 0
          : chrome
            ? Math.max(
                id === "options" ? 48 : 36,
                widthsRef.current[id] ?? (id === "options" ? 48 : 36),
              )
            : clampColumnWidth(widthsRef.current[id] ?? 120, minWidth);
        if (!hidden && !chrome && widthsRef.current[id] == null) {
          widthsRef.current[id] = width;
        }
        return { id, chrome, hidden, width };
      });

    const available = Math.max(0, wrap.clientWidth);
    const stretch = planned.filter((col) => !col.hidden && !col.chrome);
    const chromeTotal = planned
      .filter((col) => !col.hidden && col.chrome)
      .reduce((sum, col) => sum + col.width, 0);
    const stretchTotal = stretch.reduce((sum, col) => sum + col.width, 0);
    const leftover = available - chromeTotal - stretchTotal;
    if (leftover > 0 && stretch.length && stretchTotal > 0) {
      let used = 0;
      stretch.forEach((col, index) => {
        const add =
          index === stretch.length - 1
            ? leftover - used
            : Math.round((col.width / stretchTotal) * leftover);
        used += add;
        col.width = Math.max(minWidth, col.width + add);
      });
    }

    const colWidths: number[] = [];
    let total = 0;
    for (const [index, th] of ths.entries()) {
      const plan = planned[index];
      if (!plan || plan.hidden) {
        colWidths.push(0);
        continue;
      }
      colWidths.push(plan.width);
      applyBox(th, plan.width, plan.chrome);
      th.style.overflow = plan.chrome ? "visible" : "hidden";
      for (const row of bodyRows) {
        const cell = row.children[index];
        if (cell instanceof HTMLTableCellElement) {
          applyBox(cell, plan.width, plan.chrome);
        }
      }
      total += plan.width;
    }
    syncColgroup(table, colWidths);
    const fitted = Math.max(total, available);
    table.style.minWidth = `${fitted}px`;
    table.style.width = `${fitted}px`;
  }, [applyHidden, minWidth, usesGenericManage]);

  const measureEdges = useCallback(() => {
    const wrap = wrapRef.current;
    const table = wrap?.querySelector("table");
    if (!wrap || !table) {
      setEdges([]);
      return;
    }
    const wrapRect = wrap.getBoundingClientRect();
    const ths = Array.from(
      table.querySelectorAll("thead th"),
    ) as HTMLTableCellElement[];
    setEdges(
      ths.flatMap((th, index) => {
        if (th.style.display === "none") return [];
        const id = columnId(th, index);
        if (id === "options") return [];
        const rect = th.getBoundingClientRect();
        return [
          {
            id,
            label: columnLabel(th, index),
            x: rect.right - wrapRect.left + wrap.scrollLeft,
            headerHeight: Math.max(rect.height, 28),
          },
        ];
      }),
    );
  }, []);

  const refresh = useCallback(() => {
    applyWidths();
    measureEdges();
  }, [applyWidths, measureEdges]);

  useLayoutEffect(() => {
    if (hydratedKeyRef.current !== storageKey) {
      widthsRef.current = readColumnWidths(storageKey);
      hiddenRef.current = new Set(readHiddenColumnIds(storageKey));
      orderRef.current = readColumnOrder(storageKey);
      hydratedKeyRef.current = storageKey;
    }
    refresh();
  }, [refresh, children, storageKey]);

  useEffect(() => {
    function onReset(event: Event) {
      const key = (event as CustomEvent<{ storageKey?: string }>).detail
        ?.storageKey;
      if (key && key !== storageKey) return;
      widthsRef.current = {};
      hydratedKeyRef.current = null;
      refresh();
    }
    window.addEventListener(COLUMN_WIDTHS_RESET_EVENT, onReset);
    return () => window.removeEventListener(COLUMN_WIDTHS_RESET_EVENT, onReset);
  }, [refresh, storageKey]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const table = wrap?.querySelector("table");
    if (!wrap) return;

    const onScroll = () => measureEdges();
    wrap.addEventListener("scroll", onScroll, { passive: true });

    let lastWrapWidth = wrap.clientWidth;
    const wrapRo = new ResizeObserver(() => {
      const width = wrap.clientWidth;
      if (Math.abs(width - lastWrapWidth) < 1) {
        measureEdges();
        return;
      }
      lastWrapWidth = width;
      refresh();
    });
    wrapRo.observe(wrap);
    const tableRo = new ResizeObserver(() => measureEdges());
    if (table) tableRo.observe(table);

    const thead = table?.querySelector("thead");
    const tbody = table?.querySelector("tbody");
    const mo = new MutationObserver(() => refresh());
    if (thead) mo.observe(thead, { childList: true, subtree: true });
    if (tbody) mo.observe(tbody, { childList: true });

    return () => {
      wrap.removeEventListener("scroll", onScroll);
      wrapRo.disconnect();
      tableRo.disconnect();
      mo.disconnect();
    };
  }, [refresh, measureEdges, storageKey]);

  function startDrag(id: string, clientX: number) {
    const table = wrapRef.current?.querySelector("table");
    const ths = table
      ? (Array.from(table.querySelectorAll("thead th")) as HTMLTableCellElement[])
      : [];
    const th = ths.find((cell, index) => columnId(cell, index) === id);
    const displayed = th?.getBoundingClientRect().width ?? 0;
    dragRef.current = {
      id,
      startX: clientX,
      startWidth:
        displayed > 8 ? displayed : widthsRef.current[id] ?? minWidth,
    };
    const edge = edges.find((item) => item.id === id);
    setGuideX(edge?.x ?? null);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const wrap = wrapRef.current;
      if (!drag || !wrap) return;
      const next = clampColumnWidth(
        drag.startWidth + (event.clientX - drag.startX),
        minWidth,
      );
      widthsRef.current[drag.id] = next;
      applyWidths();
      const wrapRect = wrap.getBoundingClientRect();
      setGuideX(event.clientX - wrapRect.left + wrap.scrollLeft);
      measureEdges();
    };

    const onUp = () => {
      dragRef.current = null;
      setGuideX(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      writeColumnWidths(storageKey, widthsRef.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function openManageColumns() {
    if (onManageColumns) {
      onManageColumns();
      return;
    }
    setGenericColumns(discoverColumns());
    setManageOpen(true);
  }

  const { outer, inner, hasOverflow } = splitOverflowClass(className);
  const headerHeight = edges[0]?.headerHeight ?? 36;

  return (
    <div
      className={cn(
        "relative min-h-0 w-full min-w-0",
        "[&_thead_th]:!font-bold [&_thead_th]:text-slate-500",
        "[&_thead_th:last-child:not([data-col-id=options])]:pr-12",
        outer,
      )}
    >
      <div
        ref={wrapRef}
        className={cn(
          "w-full [&_td]:overflow-hidden",
          hasOverflow && "h-full min-h-0",
          "[&_th]:border-r [&_th]:border-slate-200",
          "[&_td]:border-r [&_td]:border-slate-200/80",
          "[&_table]:border-b [&_table]:border-slate-200",
          inner,
        )}
      >
        {children}
        {edges.map((edge) => {
          const dragging = guideX != null && dragRef.current?.id === edge.id;
          return (
            <button
              key={edge.id}
              type="button"
              tabIndex={-1}
              aria-label={`Resize ${edge.label} column`}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                startDrag(edge.id, event.clientX);
              }}
              className="group absolute top-0 z-20 w-3 -translate-x-1/2 cursor-col-resize touch-none border-0 bg-transparent p-0"
              style={{ left: edge.x, height: "100%" }}
            >
            <span
              className={cn(
                "mx-auto block h-full w-px transition-colors",
                "bg-transparent group-hover:w-0.5 group-hover:bg-[#5A32A3]",
                dragging && "w-0.5 bg-[#5A32A3]",
              )}
            />
            </button>
          );
        })}
        {guideX != null ? (
          <div
            className="pointer-events-none absolute top-0 z-30 w-px bg-[#5A32A3]"
            style={{ left: guideX, height: "100%" }}
          />
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute top-0 right-0 z-40 flex items-center justify-end pr-2"
        style={{ height: headerHeight }}
      >
        <div className="pointer-events-auto">
          <TableDisplayOptionsMenu
            storageKey={storageKey}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            pageSizeOptions={pageSizeOptions}
            onManageColumns={openManageColumns}
          />
        </div>
      </div>

      {usesGenericManage ? (
        <ManageColumnsModal
          open={manageOpen}
          columns={genericColumns}
          onClose={() => setManageOpen(false)}
          onSave={(cols) => {
            const hidden = cols.filter((col) => !col.checked).map((col) => col.id);
            const order = cols.map((col) => col.id);
            hiddenRef.current = new Set(hidden);
            orderRef.current = order;
            writeHiddenColumnIds(storageKey, hidden);
            writeColumnOrder(storageKey, order);
            setManageOpen(false);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}
