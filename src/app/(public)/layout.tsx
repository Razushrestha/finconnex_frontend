export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-dvh bg-white text-slate-900 antialiased"
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}
