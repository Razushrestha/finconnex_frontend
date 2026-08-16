import React from "react";
import {
  RecipientStatusRow,
  type RecipientStatusData,
} from "./RecipientStatusRow";

interface RecipientStatusSectionProps {
  recipients: RecipientStatusData[];
}

export const RecipientStatusSection: React.FC<RecipientStatusSectionProps> = ({
  recipients,
}) => {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-slate-800">Recipient status</h2>
      <div className="space-y-3">
        {recipients.map((recipient) => (
          <RecipientStatusRow key={recipient.id} recipient={recipient} />
        ))}
      </div>
    </div>
  );
};
