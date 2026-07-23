import { redirect } from "next/navigation";

/** Settings root → Organization hub (SRS §27.1). */
export default function SettingsRootPage() {
  redirect("/settings/organization");
}
