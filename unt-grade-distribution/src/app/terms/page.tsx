import type { Metadata } from "next";
import { pageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `Terms of Service | ${SITE_NAME}`,
  description: "Terms of service for UNT Grades: what search activity the site logs and how to request that data.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem-1px)] max-w-3xl flex-col px-4 py-12 text-ui-text">
      <div className="rounded-[28px] border p-6 backdrop-blur border-ui-border bg-ui-surface dark:rounded-xl md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ui-muted">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ui-text">
          Terms of Service
        </h1>
        <div className="mt-4 space-y-4 leading-7 text-ui-muted">
          <p>
            This site logs search activity so we can understand what courses people are looking for.
          </p>
          <p>
            Logged data can be requested publicly by emailing{" "}
            <a
              href="mailto:chat.untgrades@gmail.com"
              className="font-medium underline underline-offset-4 transition hover:decoration-ui-accent text-ui-muted decoration-ui-accent/50 hover:text-ui-accent"
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
