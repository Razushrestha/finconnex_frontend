"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseDataTableProps<T> {
  data: T[];
  defaultWidths: Record<string, number>;
  minWidths: Record<string, number>;
  pageSize?: number;
  searchFilterFn: (item: T, query: string) => boolean;
  statusFilterFn?: (item: T, status: string) => boolean;
}

export function useDataTable<T>({
  data,
  defaultWidths,
  minWidths,
  pageSize = 8,
  searchFilterFn,
  statusFilterFn,
}: UseDataTableProps<T>) {
  const [items, setItems] = useState<T[]>(data);
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [page, setPage] = useState(1);

  // Delete modal target state
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync initial data on mount
  useEffect(() => {
    setIsMounted(true);
    setItems(data);
  }, [JSON.stringify(data)]);

  // --- Column Resize Logic ---
  const [widths, setWidths] = useState(defaultWidths);
  const [resizeLineX, setResizeLineX] = useState<number | null>(null);
  const [activeResizeKey, setActiveResizeKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    key: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const onMouseDown = useCallback(
    (key: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      drag.current = { key, startX: e.clientX, startWidth: widths[key] };
      setActiveResizeKey(key);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setResizeLineX(
          e.clientX - rect.left + (containerRef.current?.scrollLeft ?? 0),
        );
      }
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [widths],
  );

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!drag.current) return;
      const { key, startX, startWidth } = drag.current;
      const minW = minWidths[key] ?? 80;
      const next = Math.max(minW, startWidth + (e.clientX - startX));
      setWidths((w) => (w[key] === next ? w : { ...w, [key]: next }));

      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setResizeLineX(
          e.clientX - rect.left + (containerRef.current?.scrollLeft ?? 0),
        );
      }
    }
    function onUp() {
      if (!drag.current) return;
      drag.current = null;
      setResizeLineX(null);
      setActiveResizeKey(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [minWidths]);

  // --- Filtering & Pagination ---
  const filteredItems = items.filter((item) => {
    const matchesSearch = searchFilterFn(item, searchQuery);
    const matchesStatus =
      !statusFilterFn ||
      statusFilter === "All" ||
      statusFilterFn(item, statusFilter);
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return {
    isMounted,
    items,
    setItems,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    page: safePage,
    setPage,
    totalPages,
    paginatedItems,
    filteredTotal: filteredItems.length,
    pageSize,
    widths,
    onMouseDown,
    resizeLineX,
    containerRef,
    activeResizeKey,
    deleteTarget,
    setDeleteTarget,
    isDeleting,
    setIsDeleting,
  };
}
