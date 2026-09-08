import React from "react";

interface SectionCardProps {
  icon?: React.ReactNode;
  title: string;
  rightLabel?: string;
  children: React.ReactNode;
}

export default function SectionCard({
  icon,
  title,
  rightLabel,
  children,
}: SectionCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-violet-600">{icon}</span>}
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        </div>
        {rightLabel && (
          <span className="text-xs text-slate-400">{rightLabel}</span>
        )}
      </div>
      {children}
    </div>
  );
}
