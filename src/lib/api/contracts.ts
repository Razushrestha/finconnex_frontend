/**
 * Module API contracts — what the backend must implement.
 * Paths are relative to {BASE}/v1
 */

import type { ApiResult } from "@/lib/api/errors";
import type {
  Page,
  PageParams,
  SoftDeleteResponse,
} from "@/lib/api/types";
import type { LeadCardData, LeadSource, LeadStatus } from "@/lib/leads/types";
import type { KanbanColumn } from "@/lib/leads/types";
import type {
  ContactCardData,
  ContactSource,
  ContactStatus,
  ContactGroup,
} from "@/lib/contacts/types";
import type {
  DealCurrency,
  DealPipeline,
  DealRecord,
  DealStage,
  DealStageTitle,
} from "@/lib/deals/types";
import type {
  Priority,
  Task,
  TaskColumn,
  TaskStatus,
  TaskType,
} from "@/lib/tasks/types";
import type { RelatedTo } from "@/lib/activities/shared";
import type { SupportTicket, TicketPriority, TicketStatus } from "@/lib/support/types";
import type { AuditEvent, RecycleBinItem } from "@/lib/rules";
import type { SessionPayload } from "@/lib/auth/types";

/* ── Auth ─────────────────────────────────────────────── */

export interface AuthApi {
  /** POST /auth/login — existing Next route may proxy later */
  login(input: {
    username: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<ApiResult<{ user: SessionPayload }>>;
  /** POST /auth/logout */
  logout(): Promise<ApiResult<{ ok: true }>>;
  /** GET /auth/me */
  me(): Promise<ApiResult<SessionPayload>>;
}

/* ── Leads ────────────────────────────────────────────── */

export interface LeadCreateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  source?: LeadSource;
  status: LeadStatus;
  owner: string;
  estimatedValue?: string;
}

export interface LeadStatusChangeInput {
  status: LeadStatus;
}

export interface LeadsApi {
  /** GET /leads/board */
  board(): Promise<ApiResult<KanbanColumn[]>>;
  /** GET /leads */
  list(params?: PageParams): Promise<ApiResult<Page<LeadCardData & { status: LeadStatus }>>>;
  /** GET /leads/:id */
  get(id: string): Promise<ApiResult<LeadCardData & { status: LeadStatus }>>;
  /** POST /leads */
  create(input: LeadCreateInput): Promise<ApiResult<LeadCardData>>;
  /** PATCH /leads/:id */
  update(
    id: string,
    patch: Partial<LeadCreateInput>,
  ): Promise<ApiResult<LeadCardData>>;
  /** POST /leads/:id/status */
  setStatus(
    id: string,
    input: LeadStatusChangeInput,
  ): Promise<ApiResult<LeadCardData>>;
  /** DELETE /leads/:id → soft delete */
  remove(id: string): Promise<ApiResult<SoftDeleteResponse>>;
}

/* ── Contacts ─────────────────────────────────────────── */

export interface ContactCreateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  company?: string;
  source?: ContactSource;
  status: ContactStatus;
  owner: string;
}

export interface ContactsApi {
  /** GET /contacts/board */
  board(): Promise<ApiResult<ContactGroup[]>>;
  /** GET /contacts */
  list(params?: PageParams): Promise<ApiResult<Page<ContactCardData & { status: ContactStatus }>>>;
  /** GET /contacts/:id */
  get(id: string): Promise<ApiResult<ContactCardData & { status: ContactStatus }>>;
  /** POST /contacts */
  create(input: ContactCreateInput): Promise<ApiResult<ContactCardData>>;
  /** PATCH /contacts/:id */
  update(
    id: string,
    patch: Partial<ContactCreateInput>,
  ): Promise<ApiResult<ContactCardData>>;
  /** DELETE /contacts/:id */
  remove(id: string): Promise<ApiResult<SoftDeleteResponse>>;
}

/* ── Deals ────────────────────────────────────────────── */

export interface DealCreateInput {
  dealName: string;
  account: string;
  contact?: string;
  stage: DealStageTitle | string;
  dealValue: string;
  currency: DealCurrency;
  probability?: number;
  owner: string;
  closeDate?: string;
  pipeline?: DealPipeline;
}

export interface DealsApi {
  /** GET /deals/pipelines */
  pipelines(): Promise<ApiResult<Record<DealPipeline, DealStage[]>>>;
  /** GET /deals */
  list(params?: PageParams & { pipeline?: DealPipeline }): Promise<
    ApiResult<Page<DealRecord & { stage: string; pipeline: DealPipeline }>>
  >;
  /** GET /deals/:id */
  get(id: string): Promise<
    ApiResult<DealRecord & { stage: string; pipeline: DealPipeline }>
  >;
  /** POST /deals */
  create(input: DealCreateInput): Promise<ApiResult<DealRecord>>;
  /** POST /deals/:id/stage */
  setStage(
    id: string,
    input: { stage: string; pipeline?: DealPipeline },
  ): Promise<ApiResult<DealRecord>>;
  /** DELETE /deals/:id */
  remove(id: string): Promise<ApiResult<SoftDeleteResponse>>;
}

/* ── Tasks ────────────────────────────────────────────── */

export interface TaskCreateInput {
  title: string;
  taskType: TaskType;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  assignedTo: string;
  relatedTo?: RelatedTo;
  description?: string;
  notes?: string;
  collaborators?: string[];
  createdBy?: string;
}

export interface TasksApi {
  /** GET /tasks/board */
  board(): Promise<ApiResult<TaskColumn[]>>;
  /** GET /tasks */
  list(params?: PageParams): Promise<ApiResult<Page<Task>>>;
  /** GET /tasks/:id */
  get(id: string): Promise<ApiResult<Task>>;
  /** POST /tasks */
  create(input: TaskCreateInput): Promise<ApiResult<Task>>;
  /** PATCH /tasks/:id */
  update(id: string, patch: Partial<TaskCreateInput>): Promise<ApiResult<Task>>;
  /** DELETE /tasks/:id */
  remove(id: string): Promise<ApiResult<SoftDeleteResponse>>;
}

/* ── Support tickets ──────────────────────────────────── */

export interface TicketCreateInput {
  subject: string;
  requester: string;
  relatedAccount?: string;
  priority: TicketPriority;
  status: TicketStatus;
  category?: string;
  assignedTo?: string;
  description: string;
  createdBy?: string;
}

export interface TicketsApi {
  /** GET /tickets */
  list(params?: PageParams): Promise<ApiResult<Page<SupportTicket>>>;
  /** GET /tickets/:id */
  get(id: string): Promise<ApiResult<SupportTicket>>;
  /** POST /tickets */
  create(input: TicketCreateInput): Promise<ApiResult<SupportTicket>>;
  /** PATCH /tickets/:id */
  update(
    id: string,
    patch: Partial<TicketCreateInput>,
  ): Promise<ApiResult<SupportTicket>>;
  /** POST /tickets/:id/status */
  setStatus(
    id: string,
    input: { status: TicketStatus },
  ): Promise<ApiResult<SupportTicket>>;
  /** DELETE /tickets/:id */
  remove(id: string): Promise<ApiResult<SoftDeleteResponse>>;
}

/* ── Cross-module rules ───────────────────────────────── */

export interface RulesApi {
  /** GET /rules/audit */
  listAudit(params?: PageParams): Promise<ApiResult<Page<AuditEvent>>>;
  /** GET /rules/recycle-bin */
  listRecycleBin(): Promise<ApiResult<RecycleBinItem[]>>;
  /** POST /rules/recycle-bin/:id/restore */
  restore(id: string): Promise<ApiResult<RecycleBinItem>>;
  /** DELETE /rules/recycle-bin/:id (purge) */
  purge(id: string): Promise<ApiResult<{ id: string }>>;
  /** GET /rules/permissions/me — effective grants for current role */
  myPermissions(): Promise<
    ApiResult<{ role: string; canDelete: boolean }>
  >;
}

/* ── Root client ──────────────────────────────────────── */

export interface FinconnexApi {
  mode: "local" | "remote";
  auth: AuthApi;
  leads: LeadsApi;
  contacts: ContactsApi;
  deals: DealsApi;
  tasks: TasksApi;
  tickets: TicketsApi;
  rules: RulesApi;
}
