export default function CreateDocumentRequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full min-h-0 w-full overflow-hidden bg-white">
      {children}
    </div>
  );
}
