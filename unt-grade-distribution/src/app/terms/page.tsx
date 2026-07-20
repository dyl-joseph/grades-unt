export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem-1px)] max-w-3xl flex-col px-4 py-12 text-jungle-bark dark:text-green-100">
      <div className="rounded-[28px] border border-jungle-tan-dark/30 bg-jungle-tan-light/85 p-6 shadow-[0_20px_60px_rgba(27,94,32,0.08)] backdrop-blur dark:border-green-900/50 dark:bg-jungle-canopy/70 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-jungle-vine/80 dark:text-green-300/70">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-bold text-primary dark:text-green-200">
          Terms of Service
        </h1>
        <div className="mt-4 space-y-4 leading-7 text-jungle-bark/80 dark:text-green-100/80">
          <p>
            This site logs search activity so we can understand what courses people are looking for.
          </p>
          <p>
            Logged data can be requested publicly by emailing{" "}
            <a
              href="mailto:chat.untgrades@gmail.com"
              className="font-medium text-jungle-vine underline decoration-jungle-vine/50 underline-offset-4 transition hover:text-primary hover:decoration-primary dark:text-green-300/80 dark:decoration-green-300/40 dark:hover:text-green-200"
            >
              chat.untgrades@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
