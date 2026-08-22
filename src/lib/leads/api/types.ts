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
  companyId?: string | null;
  companyName?: string | null;
  companyWebsite?: string | null;
  industry?: string | null;
  status: CrmLeadStatus | string;
  lifecycleStage?: string;
  source?: CrmLeadSource | string | null;
  score?: number;
  rating?: string | null;
  productInterest?: string | null;
  budgetRange?: string | null;
  estimatedValue?: string | null;
  notes?: string | null;
  isConverted?: boolean;
  convertedAt?: string | null;
  convertedContactId?: string | null;
  convertedDealId?: string | null;
  convertedCompanyId?: string | null;
  ownerId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CrmLeadKanbanColumn = {
  status: CrmLeadStatus | string;
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

export type CrmCreateLeadInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  companyName?: string;
  companyWebsite?: string;
  industry?: string;
  source?: CrmLeadSource;
  productInterest?: string;
  budgetRange?: string;
  estimatedValue?: string;
  notes?: string;
  ownerId?: string;
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
