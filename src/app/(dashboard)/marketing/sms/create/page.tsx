import { redirect } from "next/navigation";

export default function CreateSmsCampaignPage() {
  redirect("/marketing/sms?create=1");
}
