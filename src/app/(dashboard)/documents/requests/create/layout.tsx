const PAGE_GRADIENT =
  "min-h-full w-full bg-[linear-gradient(90deg,#efe8f6_0%,#f5eef2_48%,#f8e6dc_100%)]";

export default function CreateDocumentRequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={PAGE_GRADIENT}>{children}</div>;
}
