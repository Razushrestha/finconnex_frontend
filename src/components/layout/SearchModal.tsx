"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Search,
  X,
  LayoutGrid,
  MessageSquareText,
  Calendar,
  PieChart,
  FileText,
  Mail,
} from "lucide-react";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const recentSearches = [
  { label: "Dashboard", icon: LayoutGrid, href: "/dashboard" },
  { label: "Chat", icon: MessageSquareText, href: "/chat" },
  { label: "Calendar", icon: Calendar, href: "/calendar" },
  { label: "Apexchart", icon: PieChart, href: "/charts" },
  { label: "Pricing", icon: FileText, href: "/pricing" },
  { label: "Email", icon: Mail, href: "/email" },
];

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [query, setQuery] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg gap-0 overflow-hidden rounded-2xl p-0"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>

        {/* Search input row */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anything's"
            className="w-full bg-transparent text-base text-gray-700 placeholder:text-gray-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close search"
            className="shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-t border-gray-100" />

        {/* Recently searched */}
        <div className="max-h-96 overflow-y-auto px-5 py-4">
          <span className="text-xs font-semibold tracking-wide text-gray-400">
            RECENTLY SEARCHED:
          </span>

          <div className="mt-2 flex flex-col">
            {recentSearches.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-left text-[15px] text-gray-700 hover:bg-gray-50"
                >
                  <Icon
                    className="h-[18px] w-[18px] text-gray-500"
                    strokeWidth={1.75}
                  />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SearchModal;
