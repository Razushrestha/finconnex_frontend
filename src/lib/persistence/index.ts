export type {
  ApiPersistenceConfig,
  PersistenceDriver,
  PersistenceMode,
  TenantContext,
} from "@/lib/persistence/types";
export {
  getTenantContext,
  setTenantContext,
  tenantScopedKey,
} from "@/lib/persistence/tenant";
export { createSessionDriver } from "@/lib/persistence/session-driver";
export { createApiDriver } from "@/lib/persistence/api-driver";
export { createMockKvBackend } from "@/lib/persistence/mock-kv";
export type { MockKvBackend } from "@/lib/persistence/mock-kv";
export {
  LEAD_CARD_MODULE_ROUTES,
  resolveModuleRestPath,
} from "@/lib/persistence/module-routes";
export {
  bootstrapPersistence,
  type BootstrapPersistenceOptions,
  type PersistenceBootstrapResult,
} from "@/lib/persistence/bootstrap";
export {
  fetchAuthBridge,
  type AuthBridgeSnapshot,
} from "@/lib/persistence/auth-bridge";
export {
  createModuleRestClient,
  type ModuleHydrateResult,
  type ModuleRestClientConfig,
} from "@/lib/persistence/module-client";
export {
  createMockModuleApi,
  type MockModuleApi,
} from "@/lib/persistence/mock-module-api";
export {
  runLiveApiCutover,
  type LiveApiCutoverOptions,
  type LiveApiCutoverResult,
} from "@/lib/persistence/cutover";
export {
  getPersistenceDriver,
  getPersistenceMode,
  setPersistenceDriver,
  enableSessionPersistence,
  enableApiPersistence,
  readPersistedJson,
  writePersistedJson,
} from "@/lib/persistence/registry";
