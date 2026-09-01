"use client";

import { useEffect, useState } from "react";
import {
  listDocumentRequests,
  type DocumentRequest,
} from "@/lib/documents/requests/types";
import { DocumentRequestsDashboard } from "@/components/documents/requests/DocumentRequestsDashboard";
import { onRecordsChange } from "@/lib/records-sync";

export default function DocumentRequestsPage() {
  const [rows, setRows] = useState<DocumentRequest[]>([]);

  useEffect(() => {
    const refresh = () => setRows(listDocumentRequests());
    refresh();
    return onRecordsChange(refresh);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <DocumentRequestsDashboard
        rows={rows}
        onRefresh={() => setRows(listDocumentRequests())}
      />
    </div>
  );
}
