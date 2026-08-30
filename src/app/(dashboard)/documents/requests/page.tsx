"use client";

import { useEffect, useState } from "react";
import {
  listDocumentRequests,
  type DocumentRequest,
} from "@/lib/documents/requests/types";
import { useCrmDocumentRequests } from "@/lib/documents/requests/use-crm-document-requests";
import { DocumentRequestsDashboard } from "@/components/documents/requests/DocumentRequestsDashboard";

export default function DocumentRequestsPage() {
  const crm = useCrmDocumentRequests();
  const [rows, setRows] = useState<DocumentRequest[]>([]);

  useEffect(() => {
    if (crm.loading) return;
    setRows(listDocumentRequests());
  }, [crm.source, crm.loading]);

  return (
    <div className="absolute inset-0 overflow-hidden">
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
