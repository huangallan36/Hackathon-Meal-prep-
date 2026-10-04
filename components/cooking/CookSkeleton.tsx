/** Loading placeholder shaped like the recipe overview */
export function CookSkeleton() {
  return (
    <div className="flex flex-col gap-5 px-5 pt-1" aria-busy="true" aria-label="Loading recipe">
      <div className="skeleton h-[236px] w-full rounded-card" />
      <div className="space-y-3">
        <div className="skeleton h-8 w-4/5 rounded-tile" />
        <div className="skeleton h-8 w-1/2 rounded-tile" />
        <div className="flex gap-2 pt-1">
          <div className="skeleton h-8 w-20 rounded-pill" />
          <div className="skeleton h-8 w-24 rounded-pill" />
          <div className="skeleton h-8 w-20 rounded-pill" />
        </div>
      </div>
      <div className="skeleton h-14 w-full rounded-pill" />
      <div className="space-y-3 rounded-card bg-surface p-5 shadow-card">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton size-10 rounded-full" />
            <div className="skeleton h-4 flex-1 rounded-pill" />
          </div>
        ))}
      </div>
    </div>
  );
}
