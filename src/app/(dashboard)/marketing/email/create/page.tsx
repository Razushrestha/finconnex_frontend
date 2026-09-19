import { redirect } from "next/navigation";

export default function CreateEmailCampaignPage() {
  redirect("/marketing/email?create=1");
}
