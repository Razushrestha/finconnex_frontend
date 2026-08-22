"use client";

import { useEffect, useState } from "react";
import {
  listDocumentRequests,
  type DocumentRequest,
} from "@/lib/documents/requests/types";
import { AllDocumentRequestsPage } from "@/components/documents/requests/AllDocumentRequestsPage";

export default function AllRequestsRoute() {
  const [rows, setRows] = useState<DocumentRequest[]>([]);

  useEffect(() => {
    setRows(listDocumentRequests());
  }, []);

  return (
    <AllDocumentRequestsPage
      rows={rows}
      onRefresh={() => setRows(listDocumentRequests())}
    />
  );
}
