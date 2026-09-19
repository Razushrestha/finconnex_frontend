import { redirect } from "next/navigation";

/**
 * Invitation emails sent before admins created accounts directly link here.
 * There is nothing left to accept: send the person to sign in, where a note
 * explains that their admin creates the account.
 */
export default function AcceptInvitationRetiredPage() {
  redirect("/login?reason=invitation_retired");
}
