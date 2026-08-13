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
import { RecentTabsHeader } from "@/components/documents/signature/overview/RecentTabsHeader";
import SignatureStatsGrid from "@/components/documents/signature/overview/SignatureStatsGrid";

export default function ESignatureOverviewPage() {
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

  useEffect(() => {
    setPage(1);
  }, [statusTab, search]);

  return (
    <div className="relative mx-auto flex w-full flex-col p-4">
      <ESignatureHeader />
      <div className="mt-4">
        <SignatureStatsGrid />
      </div>

      <div className="mt-4 flex flex-col rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] dark:border-zinc-800 dark:bg-zinc-950">
        <RecentTabsHeader />
      </div>
    </div>
  );
}
