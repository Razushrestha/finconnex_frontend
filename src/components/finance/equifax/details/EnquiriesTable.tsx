import React from "react";

export interface EnquiryItem {
  date: string;
  provider: string;
  purpose: string;
  amount: string;
}

interface EnquiriesTableProps {
  enquiries: EnquiryItem[];
}

export default function EnquiriesTable({
  enquiries = [],
}: EnquiriesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="text-[11px] font-medium text-slate-400">
            <th className="px-3 py-2 font-medium">DATE</th>
            <th className="px-3 py-2 font-medium">CREDIT PROVIDER</th>
            <th className="px-3 py-2 font-medium">PURPOSE &amp; TYPE</th>
            <th className="px-3 py-2 font-medium text-right">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {enquiries.map((e, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="px-3 py-3 text-slate-600">{e.date}</td>
              <td className="px-3 py-3 font-medium text-violet-600">
                {e.provider}
              </td>
              <td className="px-3 py-3 text-slate-600">{e.purpose}</td>
              <td className="px-3 py-3 text-right font-medium text-slate-900">
                {e.amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
