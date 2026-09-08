import React from "react";
import { Badge } from "@/components/ui/badge";

export interface Director {
  name: string;
  role: string;
  dvsStatus: string;
  personalScore: number;
  personalScoreLabel: string;
  crossGuarantorRisk: string;
}

interface DirectorsTableProps {
  directors: Director[];
  onViewIndividualFile?: (director: Director) => void;
}

export default function DirectorsTable({
  directors = [],
  onViewIndividualFile,
}: DirectorsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="text-[11px] font-medium text-slate-400">
            <th className="px-3 py-2 font-medium">DIRECTOR / SHAREHOLDER</th>
            <th className="px-3 py-2 font-medium">ROLE &amp; SHAREHOLDING</th>
            <th className="px-3 py-2 font-medium">DVS / IDENTITY STATUS</th>
            <th className="px-3 py-2 font-medium">PERSONAL EQUIFAX SCORE</th>
            <th className="px-3 py-2 font-medium">CROSS-GUARANTOR RISK</th>
            <th className="px-3 py-2 font-medium text-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {directors.map((d) => (
            <tr key={d.name} className="border-t border-slate-100">
              <td className="px-3 py-3 font-medium text-slate-900">{d.name}</td>
              <td className="px-3 py-3 text-slate-600">{d.role}</td>
              <td className="px-3 py-3">
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
                  {d.dvsStatus}
                </Badge>
              </td>
              <td className="px-3 py-3">
                <span className="mr-2 font-semibold text-slate-900">
                  {d.personalScore}
                </span>
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  {d.personalScoreLabel}
                </Badge>
              </td>
              <td className="px-3 py-3 text-slate-600">
                {d.crossGuarantorRisk}
              </td>
              <td className="px-3 py-3 text-right">
                <button
                  onClick={() => onViewIndividualFile?.(d)}
                  className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-100"
                >
                  View Individual File
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
