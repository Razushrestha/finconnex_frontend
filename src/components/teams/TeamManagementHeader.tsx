"use client";

interface TeamManagementHeaderProps {
  currentPage?: string;
}

export function TeamManagementHeader({
  currentPage = "Team Management",
}: TeamManagementHeaderProps) {
  return (
    <h1 className="mb-6 text-[15px] font-bold tracking-tight text-slate-900">
      {currentPage}
    </h1>
  );
}
