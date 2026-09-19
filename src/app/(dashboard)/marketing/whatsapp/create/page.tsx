import { redirect } from "next/navigation";

export default function CreateWhatsAppCampaignPage() {
  redirect("/marketing/whatsapp?create=1");
}
