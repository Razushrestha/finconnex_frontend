"use client";

import React, { useState } from "react";
import { Plus, Download } from "lucide-react";
import MetricsCards from "@/components/finance/agreements/MetricsCards";
import AgreementFilters from "@/components/finance/agreements/AgreementFilters";
import AgreementTable from "@/components/finance/agreements/AgreementTable";
import { CreateAgreementModal } from "@/components/finance/agreements/create/CreateAgreementModal";
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

export default function ServiceAgreementsPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<Agreement | null>(
    null,
  );

  // States for handling the confirmation modal deletion flow
  const [agreementToDelete, setAgreementToDelete] = useState<string | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Initial base dataset containing 24 entries
  const [agreements, setAgreements] = useState<Agreement[]>(() =>
    Array.from({ length: 24 }, (_, index) => ({
      id: `AGR-2026-${String(index + 1).padStart(2, "0")}`,
      title: `MSA-YL-00${index + 2}`,
      client: index % 2 === 0 ? "Harbour Loans Management" : "Greystone Realty",
      desc: "Brokerage Advisory & Compliance Support",
      cycle: index % 2 === 0 ? "Monthly Retainer" : "Quarterly Invoiced",
      tier:
        index % 2 === 0
          ? "Tier 1 (24/7 Priority)"
          : "Tier 2 (Standard Business)",
      dates: `01/01/${selectedYear} - 31/12/${selectedYear}`,
      status:
        index === 3 ? "Under Review" : index === 4 ? "Expiring" : "Active",
      value: `$${(3600 + index * 400).toLocaleString()}.00`,
    })),
  );

  const handleSaveAgreement = (newAgreementData: {
    client: string;
    title: string;
    cycle: string;
    tier: string;
    value: string;
  }) => {
    if (editingAgreement) {
      setAgreements((prev) =>
        prev.map((item) =>
          item.id === editingAgreement.id
            ? {
                ...item,
                client: newAgreementData.client || item.client,
                title: newAgreementData.title || item.title,
                cycle: newAgreementData.cycle || item.cycle,
                tier: newAgreementData.tier || item.tier,
                value: newAgreementData.value || item.value,
              }
            : item,
        ),
      );
    } else {
      const newEntry: Agreement = {
        id: `AGR-2026-${String(agreements.length + 1).padStart(2, "0")}`,
        title: newAgreementData.title || "MSA-YL-Custom",
        client: newAgreementData.client || "Harbour Loans Management",
        desc: "Brokerage Advisory & Compliance Support",
        cycle: newAgreementData.cycle || "Monthly Retainer",
        tier: newAgreementData.tier || "Tier 1 (24/7 Priority)",
        dates: `04/01/${selectedYear} - 03/31/2027`,
        status: "Active",
        value: newAgreementData.value || "$3,500.00",
      };

      setAgreements([newEntry, ...agreements]);
    }

    setIsModalOpen(false);
    setEditingAgreement(null);
  };

  const handleEdit = (agreement: Agreement) => {
    setEditingAgreement(agreement);
    setIsModalOpen(true);
  };

  const handleDownload = (agreementId: string) => {
    alert(`Downloading agreement document for reference: ${agreementId}`);
  };

  // 1. Triggered when clicking delete on the table row
  const handleDeletePrompt = (agreementId: string) => {
    setAgreementToDelete(agreementId);
  };

  // 2. Triggered when confirming inside the modal
  const handleConfirmDelete = async () => {
    if (!agreementToDelete) return;

    setIsDeleting(true);
    // Simulate network latency or async API request if needed
    await new Promise((resolve) => setTimeout(resolve, 500));

    setAgreements((prev) =>
      prev.filter((item) => item.id !== agreementToDelete),
    );
    setIsDeleting(false);
    setAgreementToDelete(null); // Close modal
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
            onClick={() => {
              setEditingAgreement(null);
              setIsModalOpen(true);
            }}
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

      {/* Create / Edit Agreement Modal */}
      <CreateAgreementModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAgreement(null);
        }}
        onCreate={handleSaveAgreement}
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
