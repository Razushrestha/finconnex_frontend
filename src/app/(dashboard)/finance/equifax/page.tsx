"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings2,
  PlayCircle,
  ClipboardList,
  AlertTriangle,
  CloudCog,
  Calendar,
} from "lucide-react";
import StatCard from "@/components/finance/equifax/StatCard";
import { SearchInput } from "@/components/ui/search-input";
import CreditTable, {
  CreditRow,
} from "@/components/finance/equifax/CreditTable";
import { PaginationBar } from "@/components/ui/pagination-bar";
import RunCreditModal from "@/components/finance/equifax/RunCreditModal";

interface EquifaxCreditPageProps {
  onConfigureApi?: () => void;
}

const STORAGE_KEY = "meta_tronix_equifax_reports";

export default function EquifaxCreditPage({
  onConfigureApi,
}: EquifaxCreditPageProps) {
  const router = useRouter();
  const [rows, setRows] = useState<CreditRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<string>("All");
  const [riskBand, setRiskBand] = useState<string>("All");
  const [dateRange, setDateRange] = useState<string>("Last 30 Days");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Load from localStorage on initial mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setRows(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved equifax reports", e);
      }
    }
  }, []);

  // Save to localStorage whenever rows change
  const saveRows = (updatedRows: CreditRow[]) => {
    setRows(updatedRows);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRows));
  };

  const handleAddNewReport = (newRow: CreditRow) => {
    const updated = [newRow, ...rows];
    saveRows(updated);
  };

  const handleDeleteReport = (rowToDelete: CreditRow) => {
    const updated = rows.filter((r) => r.fileRef !== rowToDelete.fileRef);
    saveRows(updated);
  };

  const filteredRows = rows.filter((row) => {
    const matchesSearch =
      row.fileRef.toLowerCase().includes(search.toLowerCase()) ||
      row.applicant.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = status === "All" || row.status === status;
    const matchesRiskBand = riskBand === "All" || row.band === riskBand;

    return matchesSearch && matchesStatus && matchesRiskBand;
  });

  const paginatedRows = filteredRows.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const navigateToDetail = (row: CreditRow) => {
    const params = new URLSearchParams({
      applicant: row.applicant,
      subLabel: row.subLabel || "",
      score: String(row.score),
      band: row.band,
      inquiryType: row.inquiryType,
      reportDate: row.reportDate,
      status: row.status,
    });
    router.push(`/finance/equifax/detail/${row.fileRef}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Equifax credit
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* <button
            onClick={onConfigureApi}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Settings2 className="h-4 w-4" />
            Configure Equifax API
          </button> */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 shadow-sm"
          >
            <PlayCircle className="h-4 w-4" />
            Run credit check
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Settings2 className="h-4 w-4" />}
          label="AVERAGE CREDIT SCORE"
          value={
            rows.length > 0
              ? Math.round(
                  rows.reduce((acc, r) => acc + Number(r.score), 0) /
                    rows.length,
                )
              : 0
          }
          description="Average score across active dynamic records"
          descriptionColor="text-emerald-600"
        />
        <StatCard
          icon={<ClipboardList className="h-4 w-4" />}
          label="CHECKS THIS MONTH"
          value={rows.length}
          description="Generated from modal submissions"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          iconBg="bg-rose-100"
          iconColor="text-rose-600"
          label="HIGH RISK ALERTS"
          value={rows.filter((r) => r.status === "High Risk").length}
          description="Defaults or adverse listings flagged"
          descriptionColor="text-rose-500"
        />
        <StatCard
          icon={<CloudCog className="h-4 w-4" />}
          label="API QUOTA USED"
          value={342 + rows.length}
          valueSuffix="/ 500"
          description="Resets in 11 days (Equifax Direct)"
        />
      </div>

      {/* Unified Search + Filter Toolbar */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder="Search credit files, applicants, or reference IDs..."
          className="w-full md:w-80"
        />

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Status"
            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-violet-500 focus:outline-none"
          >
            <option value="All">Status: All</option>
            <option value="Verified">Verified</option>
            <option value="Conditional">Conditional</option>
            <option value="High Risk">High Risk</option>
          </select>

          <select
            value={riskBand}
            onChange={(e) => {
              setRiskBand(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Risk Band"
            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-violet-500 focus:outline-none"
          >
            <option value="All">Risk Band: All</option>
            <option value="Excellent">Excellent</option>
            <option value="Very High">Very High</option>
            <option value="Good">Good</option>
            <option value="Average">Average</option>
            <option value="Adverse">Adverse</option>
          </select>

          <div className="relative flex items-center">
            <Calendar className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Date Range"
              className="h-8 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 focus:border-violet-500 focus:outline-none"
            >
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Last 90 Days">Last 90 Days</option>
              <option value="This Year">This Year</option>
              <option value="All Time">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table + Pagination Bar Container */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CreditTable
          rows={paginatedRows}
          onRowClick={navigateToDetail}
          onViewReport={navigateToDetail}
          onOpenExternal={(row) => console.log("Open external", row.fileRef)}
          onDelete={handleDeleteReport}
        />
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={filteredRows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          entriesLabel="records"
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>

      {/* Modal component */}
      <RunCreditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddNewReport}
      />
    </div>
  );
}
