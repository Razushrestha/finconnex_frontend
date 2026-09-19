export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="min-h-64 flex-1 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
