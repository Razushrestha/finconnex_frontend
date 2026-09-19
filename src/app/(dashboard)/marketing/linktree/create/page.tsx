import { redirect } from "next/navigation";

export default function CreateLinktreePage() {
  redirect("/marketing/linktree?create=1");
}
