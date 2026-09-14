import { Suspense } from "react";
import DocumentsList from "@/components/documents/signature/documents/DocumentsList";

export default function SignatureDocumentsPage() {
  return (
    <Suspense fallback={null}>
      <DocumentsList />
    </Suspense>
  );
}
