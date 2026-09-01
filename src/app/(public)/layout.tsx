export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#F7F6F9] text-slate-900 antialiased">
      {children}
    </div>
  );
}
