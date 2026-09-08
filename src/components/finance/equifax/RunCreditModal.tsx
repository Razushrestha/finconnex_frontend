"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, ShieldCheck, CloudCog, FileText, Loader2 } from "lucide-react";
import { CreditRow } from "./CreditTable";

interface RunCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newRow: CreditRow) => void;
}

export default function RunCreditModal({
  isOpen,
  onClose,
  onSubmit,
}: RunCreditModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [entityType, setEntityType] = useState<"commercial" | "consumer">(
    "commercial",
  );

  // Commercial fields
  const [companyName, setCompanyName] = useState("");
  const [acnAbn, setAcnAbn] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [directorDob, setDirectorDob] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  // Consumer fields
  const [title, setTitle] = useState("Mr.");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Male (He/Him)");
  const [licenceState, setLicenceState] = useState("QLD");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");

  // Common fields
  const [inquiryPurpose, setInquiryPurpose] = useState("");
  const [facilityAmount, setFacilityAmount] = useState("");

  // Toggleable scopes state
  const [selectedScopes, setSelectedScopes] = useState({
    scope1: true,
    scope2: false,
    scope3: false,
  });

  // Handle hydration / client-side mount for Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close modal on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const toggleScope = (key: keyof typeof selectedScopes) => {
    setSelectedScopes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const applicantName =
      entityType === "commercial"
        ? companyName || "Unnamed Company Pty Ltd"
        : `${firstName || "John"} ${lastName || "Doe"} (Individual)`;

    const subLabelText =
      entityType === "commercial"
        ? `ABN ${acnAbn || "00 000 000 000"} · Commercial IRB`
        : `DOB: ${dob || "DD/MM/YYYY"} · Personal Credit Audit`;

    const fileRef = `ERX-${Math.floor(1000 + Math.random() * 9000)}`;
    const score = entityType === "commercial" ? 760 : 715;
    const band = "Excellent";
    const inquiryType =
      entityType === "commercial"
        ? "Comprehensive Commercial"
        : "Consumer Credit File";

    const newReport: CreditRow = {
      fileRef,
      applicant: applicantName,
      subLabel: subLabelText,
      score,
      band,
      inquiryType,
      reportDate: new Date().toLocaleDateString("en-GB"),
      status: "Verified",
    };

    // Simulate gateway delay before submitting and redirecting
    setTimeout(() => {
      onSubmit(newReport);
      setIsLoading(false);
      onClose();

      // Redirect to the detail page with query parameters
      router.push(
        `/finance/equifax/detail/${fileRef}?applicant=${encodeURIComponent(
          applicantName,
        )}&inquiryType=${encodeURIComponent(inquiryType)}&score=${score}&band=${band}`,
      );
    }, 1500);
  };

  // Rendered through a React Portal directly to document.body
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  Run New Credit Check
                </h2>
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600 border border-violet-100">
                  Equifax Direct API
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pull real-time Equifax credit files, CCR payment history, and
                commercial adverse records.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 max-h-[75vh] overflow-y-auto"
        >
          {/* Inquiry Category Toggle */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Inquiry Category
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setEntityType("consumer")}
                className={`py-2 text-xs font-medium rounded-lg transition-all ${
                  entityType === "consumer"
                    ? "bg-white text-violet-600 shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Individual / Consumer
              </button>
              <button
                type="button"
                onClick={() => setEntityType("commercial")}
                className={`py-2 text-xs font-medium rounded-lg transition-all ${
                  entityType === "commercial"
                    ? "bg-white text-violet-600 shadow-sm font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Commercial Entity / Company
              </button>
            </div>
          </div>

          {/* Dynamic Section 1: Entity/Applicant Details */}
          {entityType === "commercial" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Company / Business Entity Details
                </h3>
                <span className="text-xs font-medium text-violet-600 cursor-pointer hover:underline">
                  Lookup ASIC Register
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Company / Entity Legal Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Greystone Commercial Pty Ltd"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    required
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-slate-600">
                      ACN / ABN
                    </label>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      <ShieldCheck className="h-3 w-3" /> Auto-Verified
                    </span>
                  </div>
                  <input
                    type="text"
                    value={acnAbn}
                    onChange={(e) => setAcnAbn(e.target.value)}
                    placeholder="e.g. 49 104 293 841"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Director / Guarantor Full Legal Name
                  </label>
                  <input
                    type="text"
                    value={directorName}
                    onChange={(e) => setDirectorName(e.target.value)}
                    placeholder="e.g. Marcus Vance"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Director Date of Birth
                  </label>
                  <input
                    type="text"
                    value={directorDob}
                    onChange={(e) => setDirectorDob(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Business Trading Address / Registered Office
                </label>
                <input
                  type="text"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="e.g. Level 4, 120 Collins Street, Melbourne VIC 3000"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Individual Applicant Identity &amp; Details
                </h3>
                <span className="text-xs font-medium text-violet-600 cursor-pointer hover:underline">
                  Equifax DVS Match
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Title
                  </label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                  >
                    <option>Mr.</option>
                    <option>Ms.</option>
                    <option>Dr.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    First &amp; Middle Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Last Name / Surname
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="text"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Gender / Pronouns
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                  >
                    <option>Male (He/Him)</option>
                    <option>Female (She/Her)</option>
                    <option>Other / Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Driver&apos;s Licence Number
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={licenceState}
                      onChange={(e) => setLicenceState(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800"
                    >
                      <option>QLD</option>
                      <option>NSW</option>
                      <option>VIC</option>
                    </select>
                    <input
                      type="text"
                      value={licenceNumber}
                      onChange={(e) => setLicenceNumber(e.target.value)}
                      placeholder="Enter licence number"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Gross Annual Income
                  </label>
                  <input
                    type="text"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(e.target.value)}
                    placeholder="e.g. $135,000"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Parameters & Consent */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Inquiry Parameters &amp; Consent
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Inquiry Purpose
                </label>
                <select
                  value={inquiryPurpose}
                  onChange={(e) => setInquiryPurpose(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                >
                  {entityType === "commercial" ? (
                    <>
                      <option value="">Select inquiry purpose...</option>
                      <option>Commercial Credit Application</option>
                      <option>Director Guarantee Audit</option>
                    </>
                  ) : (
                    <>
                      <option value="">Select inquiry purpose...</option>
                      <option>Personal / Residential Loan</option>
                      <option>Consumer Credit Verification</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Requested Facility / Loan Amount
                </label>
                <input
                  type="text"
                  value={facilityAmount}
                  onChange={(e) => setFacilityAmount(e.target.value)}
                  placeholder="e.g. $150,000"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Consent Notice Box */}
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">
                  {entityType === "commercial"
                    ? "Explicit Client Consent Required."
                    : "Explicit Consumer Consent Required:"}
                </span>{" "}
                Privacy Act 1988 &amp; Comprehensive Credit Reporting (CCR)
                authorization must be signed electronically before running.{" "}
                <span className="underline cursor-pointer font-medium text-emerald-700">
                  View sample audit trail certificate
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Scope Selection */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              3. Select Equifax Check Scope (Toggle Options)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Scope Card 1 */}
              <div
                onClick={() => toggleScope("scope1")}
                className={`cursor-pointer rounded-xl border-2 p-3 relative transition-all ${
                  selectedScopes.scope1
                    ? "border-violet-600 bg-violet-50/30"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-slate-900">
                    {entityType === "commercial"
                      ? "Comprehensive Risk Score"
                      : "Comprehensive Credit File"}
                  </span>
                  <span
                    className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${
                      selectedScopes.scope1
                        ? "bg-violet-600 text-white"
                        : "border border-slate-300 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  {entityType === "commercial"
                    ? "Director CCR & commercial credit score rating."
                    : "CCR 24+ month payment history & score."}
                </p>
                <span className="inline-block rounded-md bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px] font-semibold">
                  1 Quota Unit
                </span>
              </div>

              {/* Scope Card 2 */}
              <div
                onClick={() => toggleScope("scope2")}
                className={`cursor-pointer rounded-xl border-2 p-3 relative transition-all ${
                  selectedScopes.scope2
                    ? "border-violet-600 bg-violet-50/30"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-slate-900">
                    {entityType === "commercial"
                      ? "PPSR & ASIC Registry"
                      : "Identity Verification"}
                  </span>
                  <span
                    className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${
                      selectedScopes.scope2
                        ? "bg-violet-600 text-white"
                        : "border border-slate-300 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  {entityType === "commercial"
                    ? "Encumbrances, security interests & shareholdings."
                    : "Equifax DVS check & domestic passport match."}
                </p>
                <span className="inline-block rounded-md bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-semibold">
                  1 Quota Unit
                </span>
              </div>

              {/* Scope Card 3 */}
              <div
                onClick={() => toggleScope("scope3")}
                className={`cursor-pointer rounded-xl border-2 p-3 relative transition-all ${
                  selectedScopes.scope3
                    ? "border-violet-600 bg-violet-50/30"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-slate-900">
                    Bankruptcy &amp; Defaults
                  </span>
                  <span
                    className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${
                      selectedScopes.scope3
                        ? "bg-violet-600 text-white"
                        : "border border-slate-300 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  APRA insolvency rules, court writ alerts &amp; defaults.
                </p>
                <span className="inline-block rounded-md bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold">
                  Included Free
                </span>
              </div>
            </div>

            {/* Quota Notice */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5">
                <CloudCog className="h-4 w-4 text-violet-600" />
                Quota Impact: Consumes{" "}
                {Object.values(selectedScopes).filter(Boolean).length} units of
                158 remaining monthly quota.
              </span>
              <span className="text-violet-600 font-medium cursor-pointer hover:underline">
                Upgrade Plan
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              Save as Draft
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-violet-600 text-white hover:bg-violet-700 shadow-sm shadow-violet-200 flex items-center gap-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Connecting to Equifax...</span>
                  </>
                ) : (
                  <span>Submit &amp; Pull Credit Report</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
