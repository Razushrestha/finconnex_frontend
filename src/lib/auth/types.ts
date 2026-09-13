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
  /**
   * The role held in `tenantId`, from Nest `WorkspaceMember.role` — OWNER for
   * whoever created the workspace. Separate from `role`, which stays the
   * platform tier (`User.globalRole`) and is `USER` for every self-signup;
   * overwriting `role` with this would strip a platform admin of their
   * console the moment they scoped into a workspace. Absent until a
   * workspace is selected, and on sessions minted before this field existed.
   */
  workspaceRole?: string | null;
  /** Login "Keep me signed in for 30 days" — sliding cookie + JWT lifetime. */
  rememberMe?: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}
