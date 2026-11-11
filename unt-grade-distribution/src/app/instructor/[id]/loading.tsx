export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8" aria-busy="true" aria-live="polite">
      <div className="mb-8 animate-pulse space-y-4">
        <div className="h-8 w-1/2 rounded-full bg-ui-raised" />
        <div className="flex gap-4">
          <div className="h-4 w-28 rounded-full bg-ui-raised" />
          <div className="h-4 w-24 rounded-full bg-ui-raised" />
          <div className="h-4 w-36 rounded-full bg-ui-raised" />
        </div>
      </div>
      <div className="mb-10 rounded-xl border p-6 border-ui-border bg-ui-surface">
        <div className="mb-4 h-5 w-72 rounded-full bg-ui-raised" />
        <div className="h-72 rounded-2xl bg-ui-raised" />
      </div>
      <div className="space-y-10">
        {Array.from({ length: 2 }).map((_, groupIndex) => (
          <div key={groupIndex} className="space-y-4">
            <div className="h-5 w-52 rounded-full bg-ui-raised" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((__, cardIndex) => (
                <div
                  key={cardIndex}
                  className="h-40 rounded-2xl border p-4 animate-pulse border-ui-border bg-ui-surface"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}