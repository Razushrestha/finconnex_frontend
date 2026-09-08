import React from "react";
import { FolderOpen } from "lucide-react";
import SectionCard from "@/components/finance/equifax/details/SectionCard";
import InfoGrid, {
  InfoItem,
} from "@/components/finance/equifax/details/InfoGrid";
import DirectorsTable, {
  Director,
} from "@/components/finance/equifax/details/DirectorsTable";

interface OverviewTabProps {
  infoItems: InfoItem[];
  directors: Director[];
  isConsumer: boolean;
}

export default function OverviewTab({
  infoItems,
  directors,
  isConsumer,
}: OverviewTabProps) {
  return (
    <SectionCard
      icon={<FolderOpen className="h-4 w-4" />}
      title={
        isConsumer
          ? "Consumer Profile & Identity Details"
          : "Entity Structure & Verified Directors"
      }
      rightLabel="Equifax Commercial Bureau Source"
    >
      <InfoGrid items={infoItems} />
      {!isConsumer && (
        <>
          <p className="mb-2 text-[11px] font-medium tracking-wide text-slate-400 mt-4">
            LINKED DIRECTORS &amp; BENEFICIAL OWNERS (CROSS-BUREAU MATCH)
          </p>
          <DirectorsTable
            directors={directors}
            onViewIndividualFile={(d) =>
              console.log("View individual file", d.name)
            }
          />
        </>
      )}
    </SectionCard>
  );
}
