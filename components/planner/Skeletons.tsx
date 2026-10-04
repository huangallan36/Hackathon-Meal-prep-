/** Loading placeholders shaped like the real results, so nothing jumps when they land */

function Line({ className }: { className: string }) {
  return <div className={`skeleton rounded-pill ${className}`} />;
}

export function ResultsSkeleton() {
  return (
    <div aria-hidden className="mt-8">
      <Line className="h-6 w-28" />
      <Line className="mt-2 h-3.5 w-44" />
      <div className="mt-4 overflow-hidden rounded-card bg-surface shadow-card">
        <div className="skeleton aspect-[16/10] w-full" />
        <div className="space-y-2.5 p-4">
          <Line className="h-3 w-24" />
          <Line className="h-5 w-3/4" />
          <Line className="h-3.5 w-1/2" />
        </div>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="mt-3 flex items-center gap-4 rounded-card bg-surface p-3 shadow-card">
          <div className="skeleton size-[84px] shrink-0 rounded-tile" />
          <div className="flex-1 space-y-2">
            <Line className="h-3 w-20" />
            <Line className="h-4 w-4/5" />
            <Line className="h-3 w-24" />
          </div>
        </div>
      ))}
      <Line className="mt-10 h-6 w-36" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="overflow-hidden rounded-card bg-surface shadow-card">
            <div className="skeleton aspect-[4/3] w-full" />
            <div className="space-y-2 p-3.5">
              <Line className="h-4 w-4/5" />
              <Line className="h-3 w-14" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
