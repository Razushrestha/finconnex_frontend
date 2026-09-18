import { accessTokenFromRequest } from "@/lib/auth/crm-bff-helpers";
import { getSession } from "@/lib/auth/session";
import { isCrmJwtExpired, resolveLiveCrmAuth } from "@/lib/auth/crm-server";

export async function canPublishPublicSign(request: Request) {
  if (await getSession()) return true;
  const header = accessTokenFromRequest(request);
  if (header && !isCrmJwtExpired(header, 0)) return true;
  const live = await resolveLiveCrmAuth();
  return Boolean(live?.accessToken);
}
