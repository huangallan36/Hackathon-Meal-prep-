/** Loading placeholders shaped like the 2.2 results, so nothing jumps when they land */

function Line({ className }: { className: string }) {
  return <div className={`skeleton rounded-pill ${className}`} />;
}

export function ResultsSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden px-5 pt-5">
      <Line className="h-5 w-40" />
      <div className="mt-3 flex gap-2">
        {[104, 80, 96, 88].map((w) => (
          <div key={w} className="flex h-[42px] shrink-0 items-center gap-2 rounded-pill border border-line bg-surface pl-1 pr-3.5">
            <div className="skeleton size-8 rounded-full" />
            <div className="skeleton h-3 rounded-pill" style={{ width: w - 48 }} />
          </div>
        ))}
      </div>
      <Line className="mt-[22px] h-5 w-36" />
      <div className="mt-3 flex gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-[140px] shrink-0 rounded-tile border border-line bg-surface p-3">
            <div className="relative h-[52px] w-[84px]">
              <div className="skeleton absolute left-0 top-0 size-[52px] rounded-full" />
              <div className="skeleton absolute left-8 top-0 size-[52px] rounded-full ring-[3px] ring-surface" />
            </div>
            <Line className="mt-2.5 h-3.5 w-24" />
            <Line className="mt-1.5 h-3 w-16" />
          </div>
        ))}
      </div>
      <Line className="mt-[22px] h-5 w-24" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-2.5 flex items-center gap-3 rounded-tile border border-line bg-surface p-2 pr-3">
          <div className="skeleton size-[60px] shrink-0 rounded-thumb" />
          <div className="flex-1 space-y-2">
            <Line className="h-4 w-3/5" />
            <Line className="h-3 w-2/5" />
            <Line className="h-2.5 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
