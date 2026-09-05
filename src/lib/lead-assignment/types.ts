/** Lead assignment rules — GET/POST/PATCH/DELETE under /v1/lead-assignment-rules (M2) */

export type LeadAssignmentMatchType = "ALL" | "TERRITORY" | "PRODUCT";

export type TerritoryMatchConfig = {
  regions?: string[];
  countries?: string[];
  postalCodePrefixes?: string[];
  industries?: string[];
  companySizes?: string[];
};

export type ProductMatchConfig = {
  productInterests?: string[];
};

export type LeadAssignmentMatchConfig = TerritoryMatchConfig &
  ProductMatchConfig;

export type LeadAssignmentRule = {
  id: string;
  workspaceId: string;
  name: string;
  isActive: boolean;
  priority: number;
  matchType: LeadAssignmentMatchType;
  matchConfig: LeadAssignmentMatchConfig;
  memberUserIds: string[];
  reassignOnInactiveOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateLeadAssignmentRuleInput = {
  name: string;
  isActive?: boolean;
  priority?: number;
  matchType: LeadAssignmentMatchType;
  territoryMatch?: TerritoryMatchConfig;
  productMatch?: ProductMatchConfig;
  memberUserIds: string[];
  reassignOnInactiveOwner?: boolean;
};

export type UpdateLeadAssignmentRuleInput =
  Partial<CreateLeadAssignmentRuleInput>;

export const COMPANY_SIZE_OPTIONS = [
  "MICRO",
  "SMALL",
  "MEDIUM",
  "LARGE",
  "ENTERPRISE",
] as const;
