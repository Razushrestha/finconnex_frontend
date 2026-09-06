"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download } from "lucide-react";
import MetricsCards from "@/components/finance/agreements/MetricsCards";
import AgreementFilters from "@/components/finance/agreements/AgreementFilters";
import AgreementTable from "@/components/finance/agreements/AgreementTable";
import { ConfirmModal } from "@/components/ui/confirm-modal";

interface Agreement {
  id: string;
  title: string;
  client: string;
  desc: string;
  cycle: string;
  tier: string;
  dates: string;
  status: string;
  value: string;
}

const STORAGE_KEY = "meta_tronix_agreements";

const defaultAgreements: Agreement[] = Array.from(
  { length: 24 },
  (_, index) => ({
    id: `AGR-2026-${String(index + 1).padStart(2, "0")}`,
    title: `MSA-YL-00${index + 2}`,
    client: index % 2 === 0 ? "Harbour Loans Management" : "Greystone Realty",
    desc: "Brokerage Advisory & Compliance Support",
    cycle: index % 2 === 0 ? "Monthly Retainer" : "Quarterly Invoiced",
    tier:
      index % 2 === 0 ? "Tier 1 (24/7 Priority)" : "Tier 2 (Standard Business)",
    dates: `01/01/2026 - 31/12/2026`,
    status: index === 3 ? "Under Review" : index === 4 ? "Expiring" : "Active",
    value: `$${(3600 + index * 400).toLocaleString()}.00`,
  }),
);

export default function ServiceAgreementsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("2026");

  // States for handling the confirmation modal deletion flow
  const [agreementToDelete, setAgreementToDelete] = useState<string | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize state from localStorage or fall back to default dataset
  const [agreements, setAgreements] = useState<Agreement[]>(() => {
    if (typeof window === "undefined") return defaultAgreements;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved agreements:", e);
      }
    }
    return defaultAgreements;
  });

  // Persist changes to localStorage so newly created items remain synced
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agreements));
  }, [agreements]);

  const handleEdit = (agreement: Agreement) => {
    router.push(`/finance/agreements/create?id=${agreement.id}`);
  };

  const handleDownload = (agreementId: string) => {
    alert(`Downloading agreement document for reference: ${agreementId}`);
  };

  const handleDeletePrompt = (agreementId: string) => {
    setAgreementToDelete(agreementId);
  };

  const handleConfirmDelete = async () => {
    if (!agreementToDelete) return;

    setIsDeleting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    setAgreements((prev) =>
      prev.filter((item) => item.id !== agreementToDelete),
    );
    setIsDeleting(false);
    setAgreementToDelete(null);
  };

  const filteredData = agreements.filter((item) => {
    const matchesTab =
      activeTab === "All" ||
      (activeTab === "Active" && item.status === "Active") ||
      (activeTab === "Pending Review" &&
        (item.status === "Under Review" || item.status === "Pending Review")) ||
      (activeTab === "Expiring" && item.status === "Expiring") ||
      (activeTab === "Terminated" && item.status === "Terminated");

    const matchesSearch =
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div></div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-card text-foreground border border-border rounded-xl hover:bg-muted transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            Export agreements
          </button>

          <button
            type="button"
            onClick={() => router.push("/finance/agreements/create")}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New agreement
          </button>
        </div>
      </div>

      <MetricsCards />

      <AgreementFilters
        data={agreements}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Data Table */}
      <AgreementTable
        data={filteredData}
        onEdit={handleEdit}
        onDownload={handleDownload}
        onDelete={handleDeletePrompt}
      />

      {/* Confirmation Modal Component Integration */}
      <ConfirmModal
        isOpen={Boolean(agreementToDelete)}
        onClose={() => setAgreementToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        variant="danger"
        title="Delete Agreement"
        description={
          <span>
            Are you sure you want to delete agreement{" "}
            <strong className="text-white">{agreementToDelete}</strong>? This
            action cannot be undone and will permanently remove all associated
            audit trails.
          </span>
        }
        confirmText="Delete Agreement"
        cancelText="Cancel"
      />
    </div>
  );
}
