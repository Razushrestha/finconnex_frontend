import { redirect } from "next/navigation";

/** Activities Attachments module removed — send bookmarks to Documents library. */
export default function AttachmentsPage() {
  redirect("/documents/library");
}
