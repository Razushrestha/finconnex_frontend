"use client";

import { Home, ChevronRight } from "lucide-react";

interface TeamManagementHeaderProps {
  currentPage?: string;
}

export function TeamManagementHeader({
  currentPage = "Team Management",
}: TeamManagementHeaderProps) {
  return (
    <nav className="mb-6 flex items-center gap-2 text-sm text-slate-400">
      <a href="/" className="flex items-center gap-1.5 hover:text-slate-600">
        <Home className="h-4 w-4" />
        Home
      </a>
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="text-slate-500">{currentPage}</span>
    </nav>
  );
}
