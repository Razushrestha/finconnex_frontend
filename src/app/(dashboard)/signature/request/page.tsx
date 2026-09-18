import { redirect } from "next/navigation";

export default function SignatureRequestIndexPage() {
  redirect("/signature/create");
}
