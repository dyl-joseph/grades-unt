export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8" aria-busy="true" aria-live="polite">
      <div className="mb-8 animate-pulse space-y-4">
        <div className="h-8 w-1/2 rounded-full bg-jungle-tan-dark/40 dark:bg-green-950/60" />
        <div className="flex gap-4">
          <div className="h-4 w-28 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
          <div className="h-4 w-24 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
          <div className="h-4 w-36 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
        </div>
      </div>
      <div className="mb-10 rounded-xl border border-jungle-tan-dark/30 bg-jungle-tan-light p-6 shadow-sm dark:border-green-900 dark:bg-jungle-canopy/60">
        <div className="mb-4 h-5 w-72 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
        <div className="h-72 rounded-2xl bg-jungle-tan-dark/20 dark:bg-green-950/30" />
      </div>
      <div className="space-y-10">
        {Array.from({ length: 2 }).map((_, groupIndex) => (
          <div key={groupIndex} className="space-y-4">
            <div className="h-5 w-52 rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((__, cardIndex) => (
                <div
                  key={cardIndex}
                  className="h-40 rounded-2xl border border-jungle-tan-dark/30 bg-jungle-tan-light/70 p-4 shadow-sm animate-pulse dark:border-green-900/60 dark:bg-jungle-canopy/40"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}