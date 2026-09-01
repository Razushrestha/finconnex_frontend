"use client";

import { useCallback, useEffect, useState } from "react";
import type { ManageColumn } from "@/components/work-queue/ManageColumnsModal";
import {
  applyTablePreferenceToColumns,
  getCrmTablePreference,
  isEmptyTablePreference,
  persistCrmTablePreference,
  resetCrmTablePreference,
  tablePreferenceFromColumns,
  tryCrmTablePreference,
} from "@/lib/table-preferences/api";

export type TablePreferenceSource = "api" | "local";

export function useCrmManageColumns(
  tableKey: string,
  defaults: ManageColumn[],
  options?: {
    loadLocal?: () => ManageColumn[];
    saveLocal?: (columns: ManageColumn[]) => void;
  },
) {
  const [columns, setColumns] = useState<ManageColumn[]>(() =>
    (options?.loadLocal?.() ?? defaults).map((c) => ({ ...c })),
  );
  const [source, setSource] = useState<TablePreferenceSource>("local");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const local = (options?.loadLocal?.() ?? defaults).map((c) => ({ ...c }));
    setColumns(local);
    let cancelled = false;
    setLoading(true);
    void tryCrmTablePreference(() => getCrmTablePreference(tableKey)).then((pref) => {
      if (cancelled) return;
      if (pref && !isEmptyTablePreference(pref)) {
        setColumns(applyTablePreferenceToColumns(defaults, pref));
        setSource("api");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // defaults/options are stable catalogs from callers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey]);

  const saveColumns = useCallback(
    (next: ManageColumn[]) => {
      const copy = next.map((c) => ({ ...c }));
      setColumns(copy);
      options?.saveLocal?.(copy);
      persistCrmTablePreference(tableKey, tablePreferenceFromColumns(tableKey, copy));
      setSource("api");
    },
    [options, tableKey],
  );

  const resetColumns = useCallback(() => {
    const copy = defaults.map((c) => ({ ...c }));
    setColumns(copy);
    options?.saveLocal?.(copy);
    resetCrmTablePreference(tableKey);
    setSource("local");
  }, [defaults, options, tableKey]);

  return { columns, setColumns, saveColumns, resetColumns, source, loading };
}
