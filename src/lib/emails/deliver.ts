import type { Email } from "@/lib/emails/types";

/**
 * Delivery is the backend's job.
 *
 * This used to POST to `/api/auth/mail/deliver`, which sends through the
 * Next.js app's *own* SendGrid credentials (`SENDGRID_API_KEY` in
 * `.env.local`) — a second delivery path running alongside the backend's.
 * With no key set on this app it threw "SendGrid is not configured on this
 * app", surfacing as a failure on actions that had already succeeded
 * server-side: `POST /workspaces/:id/members` and `POST /workspaces/:id/emails`
 * both return 201 and the backend queues its own delivery job.
 *
 * Kept as a no-op so the call sites in `@/lib/emails/api` keep their shape.
 * Restore a real implementation only if the app is meant to deliver mail
 * itself, which would mean sending every message twice.
 */
export async function deliverQueuedCrmEmail(email: Email | null) {
  void email;
}
