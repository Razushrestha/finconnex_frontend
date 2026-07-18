import { cn } from "@/lib/utils";

export function ChartSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl border border-gray-100 bg-white p-5",
        className,
      )}
    >
      <div className="mb-4 h-4 w-32 rounded bg-gray-100" />
      <div className="h-40 rounded-xl bg-gray-50" />
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ChartSkeleton key={i} className="min-h-[180px]" />
      ))}
    </div>
  );
}
