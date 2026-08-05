import React from "react";

interface EntityHeaderProps {
  title: string;
  description: string;
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  actionLabel: string;
  onActionClick: () => void;
}

export const EntityHeader: React.FC<EntityHeaderProps> = ({
  title,
  description,
  actionLabel,
  onActionClick,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Primary Action Button */}
        <button
          onClick={onActionClick}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity shrink-0"
        >
          <span>+</span> {actionLabel}
        </button>
      </div>
    </div>
  );
};
