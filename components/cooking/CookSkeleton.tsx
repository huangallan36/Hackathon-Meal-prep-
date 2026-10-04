/** Loading placeholder shaped like the recipe overview */
export function CookSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-5 pt-2" aria-busy="true" aria-label="Loading recipe">
      <div className="space-y-2">
        <div className="skeleton h-9 w-4/5 rounded-thumb" />
        <div className="skeleton h-4 w-1/2 rounded-pill" />
      </div>
      <div className="skeleton h-[200px] w-full rounded-card" />
      <div className="space-y-3 rounded-card bg-surface p-4 shadow-card">
        <div className="skeleton h-5 w-28 rounded-pill" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton size-9 rounded-full" />
            <div className="skeleton h-4 flex-1 rounded-pill" />
          </div>
        ))}
      </div>
    </div>
  );
}
