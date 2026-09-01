import type { SettingsValues } from "@/lib/settings/settings-store";
import type { WorkspaceMember } from "@/lib/workspace-members/types";

export type WorkspaceChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type WorkspaceProfile = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  locale: string;
  timezone: string;
  language: string;
  currency: string;
  limits: Record<string, number>;
  usage: Record<string, number>;
  checklist: WorkspaceChecklistItem[];
};

export type WorkspaceMembersAdminPage = {
  items: WorkspaceMember[];
  total: number;
};

export type WorkspaceMemberPreferences = SettingsValues;
