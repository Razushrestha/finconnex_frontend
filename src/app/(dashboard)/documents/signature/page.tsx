"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SIGNATURE_STATUSES,
  signatureRequests as seed,
  listSignatureRequests,
  type SignatureRequest,
  type SignatureStatus,
} from "@/lib/documents/signature/types";
import { ESignatureHeader } from "@/components/documents/signature/ESignatureHeader";
import { StatusTabs } from "@/components/documents/signature/StatusTabs";
import { SearchBar } from "@/components/documents/signature/SearchBar";
import { SignatureRequestsTable } from "@/components/documents/signature/SignatureRequestsTable";
import { ExportSignatureLogCsv } from "@/components/documents/signature/ExportSignatureLogCsv";

export default function ESignaturePage() {
  const router = useRouter();
  const [requests, setRequests] = useState<SignatureRequest[]>(seed);
  const [statusTab, setStatusTab] = useState<SignatureStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setRequests(listSignatureRequests());
  }, []);

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      SIGNATURE_STATUSES.map((s) => [s, 0]),
    ) as Record<SignatureStatus, number>;
    for (const r of requests) map[r.status] += 1;
    return map;
  }, [requests]);

  const filtered = useMemo(() => {
    let data: SignatureRequest[] = requests;
    if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.documentName.toLowerCase().includes(q) ||
          r.signatureRequestId.toLowerCase().includes(q) ||
          r.signer.toLowerCase().includes(q) ||
          r.signers?.some(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              s.email.toLowerCase().includes(q),
          ) ||
          (r.relatedTo?.toLowerCase().includes(q) ?? false),
      );
    }
    return data;
  }, [requests, statusTab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [statusTab, search]);

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div className="relative mx-auto flex max-w-[1400px] flex-col p-2.5 sm:p-3 lg:p-4">
        <ESignatureHeader
          onExport={() => ExportSignatureLogCsv(filtered)}
        />

        <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-4">
            <StatusTabs
              statuses={SIGNATURE_STATUSES}
              active={statusTab}
              counts={counts}
              total={requests.length}
              onChange={setStatusTab}
            />
            <SearchBar value={search} onChange={setSearch} />
          </div>

          <SignatureRequestsTable
            rows={paginated}
            page={safePage}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onRowClick={(r) => router.push(`/documents/signature/${r.id}`)}
          />
        </div>
      </div>
    </div>
  );
}
