export default function Loading() {
  return (
    <main className="relative min-h-[calc(100dvh-4rem-1px)] overflow-hidden px-4 py-8 md:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-80">
        <div className="absolute left-[-10%] top-[-8%] h-72 w-72 rounded-full bg-green-400/15 blur-3xl" />
        <div className="absolute right-[-8%] top-[18%] h-80 w-80 rounded-full bg-jungle-gold/10 blur-3xl" />
        <div className="absolute bottom-[-12%] left-[20%] h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="mb-4 h-6 w-48 animate-pulse rounded-full bg-jungle-tan-dark/30 dark:bg-green-950/50" />
          <div className="h-14 w-[min(92vw,42rem)] animate-pulse rounded-full bg-jungle-tan-dark/25 dark:bg-green-950/50" />
          <div className="mt-4 h-5 w-[min(88vw,34rem)] animate-pulse rounded-full bg-jungle-tan-dark/20 dark:bg-green-950/40" />
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_auto_1fr]">
          {Array.from({ length: 2 }).map((_, index) => (
            <section
              key={index}
              className="rounded-[28px] border border-jungle-tan-dark/30 bg-jungle-tan-light/90 p-5 shadow-[0_20px_60px_rgba(27,94,32,0.08)] backdrop-blur dark:border-green-900/50 dark:bg-jungle-canopy/70 md:p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="space-y-3">
                  <div className="h-3 w-32 animate-pulse rounded-full bg-jungle-tan-dark/25 dark:bg-green-950/50" />
                  <div className="h-8 w-56 animate-pulse rounded-full bg-jungle-tan-dark/25 dark:bg-green-950/50" />
                </div>
                <div className="h-8 w-16 animate-pulse rounded-full bg-jungle-tan-dark/25 dark:bg-green-950/50" />
              </div>
              <div className="mb-4 h-11 animate-pulse rounded-full bg-jungle-tan-dark/20 dark:bg-green-950/40" />
              <div className="mb-4 h-16 animate-pulse rounded-2xl bg-jungle-tan-dark/15 dark:bg-green-950/30" />
              <div className="rounded-3xl border border-jungle-tan-dark/25 bg-[#FBF8F3] p-4 dark:border-green-900/50 dark:bg-jungle-canopy/60">
                <div className="mb-4 h-5 w-48 animate-pulse rounded-full bg-jungle-tan-dark/20 dark:bg-green-950/40" />
                <div className="h-[280px] animate-pulse rounded-2xl bg-jungle-tan-dark/15 dark:bg-green-950/30" />
              </div>
            </section>
          ))}

          <div className="flex items-center justify-center lg:min-h-full">
            <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full border border-jungle-tan-dark/25 bg-white/80 shadow-lg dark:border-green-800/60 dark:bg-jungle-canopy/90" />
          </div>
        </div>
      </div>
    </main>
  );
}