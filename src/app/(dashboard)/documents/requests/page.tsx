"use client";

import { useEffect, useState } from "react";
import {
  listDocumentRequests,
  type DocumentRequest,
} from "@/lib/documents/requests/types";
import { useCrmDocumentRequests } from "@/lib/documents/requests/use-crm-document-requests";
import { DocumentRequestsDashboard } from "@/components/documents/requests/DocumentRequestsDashboard";
import { onRecordsChange } from "@/lib/records-sync";

export default function DocumentRequestsPage() {
  const crm = useCrmDocumentRequests();
  const [rows, setRows] = useState<DocumentRequest[]>([]);

  useEffect(() => {
    if (crm.loading) return;
    const refresh = () => setRows(listDocumentRequests());
    refresh();
    return onRecordsChange(refresh);
  }, [crm.source, crm.loading]);

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <DocumentRequestsDashboard
        rows={rows}
        source={crm.source}
        loading={crm.loading}
        error={crm.error}
        onRefresh={() => setRows(listDocumentRequests())}
      />
    </div>
  );
}
