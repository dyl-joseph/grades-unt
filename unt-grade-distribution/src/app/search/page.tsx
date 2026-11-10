import type { Metadata } from "next";
import Link from "next/link";
import SimilarSearches from "./SimilarSearches";
import { pageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `Search Results | ${SITE_NAME}`,
  description: "Search UNT Grades for University of North Texas courses and professors.",
  path: "/search",
});

type SearchPageProps = {
  searchParams: Promise<{ query?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { query } = await searchParams;
  const trimmedQuery = query?.trim() ?? "";
  const searchedQuery = trimmedQuery || "that search";

  return (
    <div className="empty-search flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 py-10 text-center">
      <div className="w-full max-w-4xl">
        <div className="mb-6 text-sm uppercase tracking-[0.3em] text-ui-accent">
          Search result
        </div>
        <h1 className="text-4xl font-bold sm:text-6xl text-ui-accent">
          No results found
        </h1>
        <p className="mt-4 text-sm text-ui-muted">
          Nothing matched &ldquo;{searchedQuery}&rdquo;
        </p>

        {/* Only suggest for a real query; the display fallback would fuzzy-match unrelated names. */}
        {trimmedQuery && <SimilarSearches query={trimmedQuery} />}

        <div className="empty-search-game mt-8 h-[min(55dvh,28rem)] w-full overflow-hidden rounded-2xl border border-ui-border bg-ui-surface">
          <iframe
            src="https://chromedino.com/color/embed/"
            title="Chrome Dino game"
            loading="lazy"
            className="h-full w-full border-0 mix-blend-multiply dark:hidden"
          />
          <iframe
            src="https://chromedino.com/batman/embed/"
            title="Chrome Dino Batman game"
            loading="lazy"
            className="hidden h-full w-full border-0 dark:block"
          />
        </div>

        <Link
          href="/"
          className="mt-7 inline-block font-mono text-sm uppercase tracking-wider underline decoration-ui-accent/50 underline-offset-4 transition text-ui-accent hover:text-ui-text"
        >
          Back to search
        </Link>
      </div>
    </div>
  );
}
