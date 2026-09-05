export const CRM_LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "UNQUALIFIED",
  "CONVERTED",
  "OPEN",
  "IN_PROGRESS",
  "NURTURE",
  "LOST",
] as const;
export type CrmLeadStatus = (typeof CRM_LEAD_STATUSES)[number];

export const CRM_LEAD_SOURCES = [
  "WEBSITE",
  "REFERRAL",
  "COLD_CALL",
  "SOCIAL_MEDIA",
  "EMAIL_CAMPAIGN",
  "PAID_AD",
  "EVENT",
  "PARTNER",
  "OTHER",
] as const;
export type CrmLeadSource = (typeof CRM_LEAD_SOURCES)[number];

export const CRM_COMPANY_SIZES = [
  "MICRO",
  "SMALL",
  "MEDIUM",
  "LARGE",
  "ENTERPRISE",
] as const;
export type CrmCompanySize = (typeof CRM_COMPANY_SIZES)[number];

export type CrmLead = {
  id: string;
  workspaceId?: string;
  leadNumber?: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  mobilePhone?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  twitterUrl?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  companyWebsite?: string | null;
  industry?: string | null;
  companySize?: CrmCompanySize | string | null;
  status: CrmLeadStatus | string;
  lifecycleStage?: string;
  source?: CrmLeadSource | string | null;
  score?: number;
  rating?: string | null;
  doNotContact?: boolean;
  productInterest?: string | null;
  budgetRange?: string | null;
  estimatedValue?: string | null;
  currency?: string | null;
  probability?: number | null;
  expectedCloseDate?: string | null;
  description?: string | null;
  notes?: string | null;
  isConverted?: boolean;
  convertedAt?: string | null;
  convertedContactId?: string | null;
  convertedDealId?: string | null;
  convertedCompanyId?: string | null;
  ownerId?: string | null;
  pipelineStage?: string;
  pipelineStageLabel?: string;
  tags?: string[];
  followerIds?: string[];
  sla?: {
    badgeBand?: string;
    badgeLabel?: string;
    stageDueAt?: string;
    detail?: string;
  } | null;
  nextBest?: {
    kind: string;
    id: string;
    title: string;
    at: string;
    priority?: string;
  } | null;
  redFlags?: Array<{ code: string; label: string }>;
  createdAt?: string;
  updatedAt?: string;
};

export type CrmCreateLeadInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  jobTitle?: string;
  department?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  companyId?: string;
  companyName?: string;
  companyWebsite?: string;
  industry?: string;
  companySize?: CrmCompanySize;
  source?: CrmLeadSource;
  productInterest?: string;
  budgetRange?: string;
  estimatedValue?: string;
  notes?: string;
  description?: string;
  ownerId?: string;
  pipelineStage?: string;
  doNotContact?: boolean;
};

export type CrmLeadKanbanColumn = {
  status?: CrmLeadStatus | string;
  pipelineStage?: string;
  pipelineStageCode?: string;
  records: CrmLead[];
  total: number;
};

export type CrmLeadListPage = {
  items: CrmLead[];
  metadata?: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
  };
};

export type CrmImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};

export type CrmBulkResult = {
  affected: number;
};
