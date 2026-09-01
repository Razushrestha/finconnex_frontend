"use client";

import { useEffect, useState } from "react";
import {
  listDocumentRequests,
  type DocumentRequest,
} from "@/lib/documents/requests/types";
import { AllDocumentRequestsPage } from "@/components/documents/requests/AllDocumentRequestsPage";
import { onRecordsChange } from "@/lib/records-sync";

export default function AllRequestsRoute() {
  const [rows, setRows] = useState<DocumentRequest[]>([]);

  useEffect(() => {
    const refresh = () => setRows(listDocumentRequests());
    refresh();
    return onRecordsChange(refresh);
  }, []);

  return (
    <AllDocumentRequestsPage
      rows={rows}
      onRefresh={() => setRows(listDocumentRequests())}
    />
  );
}
