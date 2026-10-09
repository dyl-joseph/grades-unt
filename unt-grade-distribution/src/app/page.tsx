import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import QuickStart from "@/components/home/QuickStart";
import RankedCourses from "@/components/home/RankedCourses";

export default function Home() {
  return (
    <div className="home-student">
      <section className="home-page relative flex min-h-[min(34rem,calc(100dvh-4rem-1px))] flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="home-title relative max-w-3xl text-center">
          <h1 className="sparkle-text sparkle-text-wide text-4xl font-bold text-primary sm:text-7xl dark:text-ui-accent">
            UNT Grade Explorer
          </h1>
          <p className="mt-3 text-xl font-medium tracking-wide text-jungle-bark/70 dark:text-ui-muted">
            Go Mean Green
          </p>
        </div>

        <div className="relative z-30 w-full max-w-3xl">
          <SearchBar />
        </div>

        <div className="relative">
          <QuickStart />
        </div>

        <Link
          href="/terms"
          className="relative text-sm font-medium text-jungle-vine underline decoration-jungle-vine/50 underline-offset-4 transition hover:text-primary hover:decoration-primary dark:text-ui-muted dark:decoration-ui-accent/50 dark:hover:text-ui-accent"
        >
          Terms of Service
        </Link>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-24 pt-6">
        <RankedCourses />
      </div>
    </div>
  );
}
