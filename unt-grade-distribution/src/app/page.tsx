import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import DepartmentGrid from "@/components/home/DepartmentGrid";
import HeroAtmosphere from "@/components/home/HeroAtmosphere";
import QuickStart from "@/components/home/QuickStart";
import RankedCourses from "@/components/home/RankedCourses";

export default function Home() {
  return (
    <div>
      <section className="relative flex min-h-[min(34rem,calc(100dvh-4rem-1px))] flex-col items-center justify-center gap-8 px-4 py-12">
        <HeroAtmosphere />
        <div className="home-title relative select-none text-center">
          <p className="sparkle-text select-none text-xl font-medium tracking-wide text-jungle-vine sm:text-2xl">
            University of North Texas
          </p>
          <h1 className="sparkle-text sparkle-text-wide select-none font-display text-5xl font-bold text-primary sm:text-6xl">
            Grade Explorer
          </h1>
          <p className="mt-3 select-none text-lg font-medium tracking-wide text-jungle-bark/70">
            Search by course (e.g., &ldquo;ACCT 2010&rdquo;) or professor name
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
        <DepartmentGrid />
      </div>
    </div>
  );
}
