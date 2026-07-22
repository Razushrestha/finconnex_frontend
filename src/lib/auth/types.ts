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
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}
