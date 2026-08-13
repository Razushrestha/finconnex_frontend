// "use client";

// import { ArrowLeft } from "lucide-react";
// import type { Call } from "@/lib/calls/types";
// import { CallHeaderSection } from "./CallHeaderSection";
// import { CallAudioPlayerSection } from "./CallAudioPlayerSection";
// import { CallTranscriptSection } from "./CallTranscriptSection";
// import { ContactSidebarCard } from "./ContactSidebarCard";
// import { RelatedEntitySidebarCard } from "./RelatedEntitySidebarCard";
// import { NextStepsSidebarCard } from "./NextStepSidebarCard";

// interface CallDetailsLayoutProps {
//   call: Call;
//   onBack: () => void;
// }

// export function CallDetailsLayout({ call, onBack }: CallDetailsLayoutProps) {
//   return (
//     <div className="mx-auto w-full p-3">
//       <div className="mb-4 border-b border-border pb-3">
//         <button
//           type="button"
//           onClick={onBack}
//           className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
//         >
//           <ArrowLeft className="h-4 w-4" />
//           Back to Calls
//         </button>
//       </div>

//       <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
//         <div className="flex flex-col gap-6 lg:col-span-2">
//           <div className="flex flex-col gap-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
//             <CallHeaderSection call={call} onBack={onBack} />
//             <CallAudioPlayerSection />
//           </div>
//           <CallTranscriptSection
//             notes={call.notes}
//             assignedTo={call.assignedTo}
//           />
//         </div>

//         <div className="flex flex-col gap-6">
//           <ContactSidebarCard contactName={call.contact} />
//           <RelatedEntitySidebarCard relatedTo={call.relatedTo} />
//           <NextStepsSidebarCard />
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { Call } from "@/lib/calls/types";
import { CallHeaderSection } from "./CallHeaderSection";
import { CallAudioPlayerSection } from "./CallAudioPlayerSection";
import { CallTranscriptSection } from "./CallTranscriptSection";
import { ContactSidebarCard } from "./ContactSidebarCard";
import { RelatedEntitySidebarCard } from "./RelatedEntitySidebarCard";
import { NextStepsSidebarCard, type NextStepItem } from "./NextStepSidebarCard";

interface CallDetailsLayoutProps {
  call: Call;
  onBack: () => void;
}

export function CallDetailsLayout({ call, onBack }: CallDetailsLayoutProps) {
  // Initialize sample next steps state
  const [steps, setSteps] = useState<NextStepItem[]>([
    {
      id: "1",
      text: "Send follow-up email with revised proposal",
      dueDate: "Overdue (Yesterday)",
      isOverdue: true,
      completed: true,
    },
    {
      id: "2",
      text: "Schedule touchpoint call if no reply",
      dueDate: "Due Oct 27",
      isOverdue: false,
      completed: false,
    },
  ]);

  const handleToggleStep = (id: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id ? { ...step, completed: !step.completed } : step,
      ),
    );
  };

  const handleAddStep = (text: string, dueDate: string) => {
    const newStep: NextStepItem = {
      id: Date.now().toString(),
      text,
      dueDate,
      isOverdue: dueDate.toLowerCase().includes("overdue"),
      completed: false,
    };
    setSteps((prev) => [...prev, newStep]);
  };

  return (
    <div className="mx-auto w-full p-3">
      <div className="mb-4 border-b border-border pb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Calls
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="flex flex-col gap-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
            <CallHeaderSection call={call} onBack={onBack} />
            <CallAudioPlayerSection />
          </div>
          <CallTranscriptSection
            notes={call.notes}
            assignedTo={call.assignedTo}
          />
        </div>

        <div className="flex flex-col gap-6">
          <ContactSidebarCard contactName={call.contact} />
          <RelatedEntitySidebarCard relatedTo={call.relatedTo} />
          <NextStepsSidebarCard
            steps={steps}
            onToggleStep={handleToggleStep}
            onAddStep={handleAddStep}
          />
        </div>
      </div>
    </div>
  );
}
