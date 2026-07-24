/**
 * Public API surface for FinConnex frontend ↔ backend integration.
 */

export { api, getApiClient, resetApiClient } from "@/lib/api/client";
export { getApiMode, getApiBaseUrl, isRemoteApi, API_VERSION_PREFIX } from "@/lib/api/config";
export type { ApiMode } from "@/lib/api/config";
export {
  ApiError,
  apiOk,
  apiFail,
  toApiError,
  type ApiResult,
  type ApiErrorBody,
  type ApiErrorCode,
} from "@/lib/api/errors";
export type {
  Page,
  PageMeta,
  PageParams,
  SoftDeleteResponse,
} from "@/lib/api/types";
export type {
  FinconnexApi,
  AuthApi,
  LeadsApi,
  ContactsApi,
  DealsApi,
  TasksApi,
  TicketsApi,
  RulesApi,
  LeadCreateInput,
  ContactCreateInput,
  DealCreateInput,
  TaskCreateInput,
  TicketCreateInput,
} from "@/lib/api/contracts";
export { ENDPOINT_CATALOG } from "@/lib/api/endpoints";
