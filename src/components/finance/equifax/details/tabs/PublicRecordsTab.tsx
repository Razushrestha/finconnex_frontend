import React from "react";
import { FileText, CheckCircle2, ExternalLink } from "lucide-react";
import SectionCard from "@/components/finance/equifax/details/SectionCard";

export default function PublicRecordsTab() {
  const filings = [
    {
      date: "14 Oct 2025",
      form: "Form 484",
      desc: "Change to Company Details (Notification of registered office address)",
      pages: "3",
      status: "Processed",
    },
    {
      date: "30 Sep 2025",
      form: "Form 388",
      desc: "Copy of Financial Statements & Reports (FY2025 Annual Return)",
      pages: "28",
      status: "Processed",
    },
    {
      date: "12 Mar 2025",
      form: "Form 484",
      desc: "Change to Company Details (Annual Solvency Resolution Confirmed)",
      pages: "2",
      status: "Processed",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Clean Status Banner */}
      <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-emerald-100 p-2 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-900">
              100% Clean ASIC &amp; Court Record — Zero Adverse Insolvency
              Filings
            </h4>
            <p className="text-xs text-emerald-700">
              0 Court Judgments • 0 Bankruptcy / Part IX/X Notices • 0 External
              Administration / Winding Up petitions.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 shadow-sm">
          Clean Public Register
        </span>
      </div>

      {/* Corporate Registry Extract Section */}
      <SectionCard
        icon={<FileText className="h-4 w-4" />}
        title="ASIC Corporate Registry Extract"
        rightLabel="ASIC Data Base Sync: Today 09:42 AEST"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] uppercase font-semibold text-slate-400">
              Company Name
            </p>
            <p className="text-sm font-bold text-slate-800 mt-1">
              Greystone Realty Pty Ltd
            </p>
            <p className="text-xs text-slate-500">ACN: 49 104 293 841</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] uppercase font-semibold text-slate-400">
              Jurisdiction &amp; Class
            </p>
            <p className="text-sm font-bold text-slate-800 mt-1">
              Victoria (VIC), Australia
            </p>
            <p className="text-xs text-slate-500">
              Australian Proprietary Company
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] uppercase font-semibold text-slate-400">
              Registry Status
            </p>
            <p className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
              Registered / Active
            </p>
            <p className="text-xs text-slate-500">Good Standing</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[10px] uppercase font-semibold text-slate-400">
              Annual Review Date
            </p>
            <p className="text-sm font-bold text-slate-800 mt-1">12 March</p>
            <p className="text-xs text-emerald-600 font-medium">
              Fully Compliant • No Penalties
            </p>
          </div>
        </div>

        <p className="mb-3 text-xs font-semibold text-slate-700 uppercase tracking-wide">
          Recent ASIC Document Filings &amp; Statutory Forms
        </p>

        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-3">Lodgement Date</th>
                <th className="p-3">Form Code &amp; Title</th>
                <th className="p-3">Description</th>
                <th className="p-3">Pages</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Document</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filings.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-medium text-slate-900">{row.date}</td>
                  <td className="p-3 font-semibold text-violet-600">
                    {row.form}
                  </td>
                  <td className="p-3 text-slate-600">{row.desc}</td>
                  <td className="p-3 text-slate-500">{row.pages}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <CheckCircle2 className="h-3 w-3" /> {row.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => console.log("View extract", row.form)}
                      className="text-violet-600 font-medium hover:underline inline-flex items-center gap-1"
                    >
                      View Extract <ExternalLink className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
