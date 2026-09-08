import React from "react";
import { History as HistoryIcon, ShieldCheck } from "lucide-react";
import SectionCard from "@/components/finance/equifax/details/SectionCard";

export default function EnquiryHistoryTab() {
  const enquiries = [
    {
      date: "14 Oct 2026, 09:42 AM",
      entity: "Zylo Workspace",
      operator: "Operator: Admin",
      class: "Commercial Credit Evaluation",
      channel: "Direct API Pull",
      amount: "$150,000",
    },
    {
      date: "18 Jun 2026, 02:15 PM",
      entity: "ANZ Banking Group",
      operator: "Institutional Lending Division",
      class: "Commercial Mortgage Refinance Review",
      channel: "Bureau Query",
      amount: "$1,200,000",
    },
    {
      date: "04 Jan 2026, 11:04 AM",
      entity: "Macquarie Leasing",
      operator: "Asset Finance Desk",
      class: "Asset Equipment Lease",
      channel: "Bureau Query",
      amount: "$85,000",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        icon={<HistoryIcon className="h-4 w-4" />}
        title="Commercial Credit Bureau Enquiries (Last 24 Months)"
        rightLabel="3 Enquiries Logged"
      >
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white mb-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-3">Date &amp; Time</th>
                <th className="p-3">Enquiring Entity / Member</th>
                <th className="p-3">Purpose &amp; Account Class</th>
                <th className="p-3">Access Channel</th>
                <th className="p-3 text-right">Amount AUD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {enquiries.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-medium text-slate-900">{row.date}</td>
                  <td className="p-3">
                    <p className="font-semibold text-violet-600">
                      {row.entity}
                    </p>
                    <p className="text-[10px] text-slate-400">{row.operator}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-slate-800">{row.class}</p>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-semibold ${
                        row.channel === "Direct API Pull"
                          ? "bg-violet-50 text-violet-600 border border-violet-100"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.channel}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900">
                    {row.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Velocity Assessment Box */}
        <div className="p-4 rounded-xl bg-violet-50/50 border border-violet-100 mb-6 flex items-start gap-3">
          <span className="text-violet-600 font-bold text-sm mt-0.5">ℹ</span>
          <div>
            <p className="text-xs font-bold text-violet-900">
              Velocity Assessment:
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Low inquiry velocity with 4- to 6-months interval spacing between
              inquiries. No signs of multi-lender credit distress or rapid
              credit-seeking behavior.
            </p>
          </div>
        </div>

        <p className="mb-3 text-xs font-semibold text-slate-700 uppercase tracking-wide">
          Equifax Credit Pull Audit Trail &amp; Consent Log
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] uppercase font-semibold text-slate-400">
              Electronic Consent
            </p>
            <p className="text-xs font-bold text-slate-800 mt-1">
              Marcus Vance (Director)
            </p>
            <p className="text-[11px] text-slate-500">
              Signed via E-Signature: 14 Oct 2026 09:38 AEST
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] uppercase font-semibold text-slate-400">
              Operator &amp; IP Address
            </p>
            <p className="text-xs font-bold text-slate-800 mt-1">Admin User</p>
            <p className="text-[11px] text-slate-500">
              IP: 144.130.82.19 (Melbourne, AU)
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] uppercase font-semibold text-slate-400">
              Audit Certificate
            </p>
            <p className="text-xs font-bold text-violet-600 mt-1 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> DOC-89104.pdf
            </p>
            <p className="text-[11px] text-slate-500">
              Cryptographic SHA-256 Verified
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
