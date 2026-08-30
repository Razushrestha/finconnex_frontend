"use client";

import { useEffect, useState } from "react";
import {
  listDocumentRequests,
  type DocumentRequest,
} from "@/lib/documents/requests/types";
import { useCrmDocumentRequests } from "@/lib/documents/requests/use-crm-document-requests";
import { AllDocumentRequestsPage } from "@/components/documents/requests/AllDocumentRequestsPage";

export default function AllRequestsRoute() {
  const crm = useCrmDocumentRequests();
  const [rows, setRows] = useState<DocumentRequest[]>([]);

  useEffect(() => {
    if (crm.loading) return;
    setRows(listDocumentRequests());
  }, [crm.source, crm.loading]);

  return (
    <AllDocumentRequestsPage
      rows={rows}
      source={crm.source}
      loading={crm.loading}
      error={crm.error}
      onRefresh={() => setRows(listDocumentRequests())}
    />
  );
}
