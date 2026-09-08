export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthTenant {
  id: string;
  slug: string;
  name: string;
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  /**
   * False only for a real, authenticated CRM user with zero workspaces yet
   * (`tenantId` is a placeholder — see `sessionFromCrmUser`). Absent on
   * older session tokens minted before this field existed; treat missing
   * as `true` so already-scoped sessions aren't sent back to onboarding.
   */
  hasWorkspace?: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}
