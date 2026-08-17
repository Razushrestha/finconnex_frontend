import React from "react";
import type { LucideIcon } from "lucide-react";

interface ToolbarButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon: Icon,
  label,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap"
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
};
