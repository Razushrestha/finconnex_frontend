"use client";

import { useEffect, useState } from "react";
import { FolderPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addReportToFolder,
  availableFoldersForReport,
} from "@/lib/reports/library/prefs";
import type { ReportFolder } from "@/lib/reports/library/types";
import { cn } from "@/lib/utils";

export function AddToFolderMenu({
  reportId,
  triggerClassName,
  refreshKey,
  onAdded,
}: {
  reportId: string;
  triggerClassName?: string;
  refreshKey?: string | number;
  onAdded?: (folderName: string) => void;
}) {
  const [destinations, setDestinations] = useState<ReportFolder[]>([]);

  function refresh() {
    setDestinations(availableFoldersForReport(reportId));
  }

  useEffect(() => {
    refresh();
  }, [reportId, refreshKey]);

  if (!destinations.length) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-semibold text-[#5A32A3] outline-none",
          triggerClassName,
        )}
      >
        <FolderPlus className="h-3.5 w-3.5" />
        Add to folder
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        {destinations.map((folder) => (
          <DropdownMenuItem
            key={folder.id}
            className="text-[12px]"
            onClick={() => {
              addReportToFolder(folder.id, reportId);
              refresh();
              onAdded?.(folder.name);
            }}
          >
            {folder.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
