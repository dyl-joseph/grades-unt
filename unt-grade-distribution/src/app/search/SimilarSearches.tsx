"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchManifest, toInstructorSlug, type ManifestEntry } from "@/lib/encryptedData";

type SimilarResult =
  | { type: "course"; label: string; detail: string; href: string; score: number }
  | { type: "instructor"; label: string; detail: string; href: string; score: number };

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function distance(left: string, right: string) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = row[rightIndex];
      row[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? diagonal
        : Math.min(diagonal + 1, row[rightIndex - 1] + 1, above + 1);
      diagonal = above;
    }
  }
  return row[right.length];
}

function similarity(query: string, candidate: string) {
  const normalizedQuery = normalize(query);
  const normalizedCandidate = normalize(candidate);
  if (!normalizedQuery || !normalizedCandidate) return 0;
  if (normalizedCandidate.includes(normalizedQuery)) return 1;
  const queryWords = normalizedQuery.split(" ");
  const candidateWords = normalizedCandidate.split(" ");
  return Math.max(
    ...queryWords.map((queryWord) =>
      Math.max(
        ...candidateWords.map((candidateWord) => {
          const length = Math.max(queryWord.length, candidateWord.length);
          return length ? 1 - distance(queryWord, candidateWord) / length : 0;
        })
      )
    )
  );
}

function findSimilarResults(manifest: ManifestEntry[], query: string) {
  const results: SimilarResult[] = [];
  const instructorKeys = new Set<string>();

  for (const entry of manifest) {
    const course = entry.preview;
    const courseScore = Math.max(
      similarity(query, `${course.prefix} ${course.number}`),
      similarity(query, course.title)
    );
    if (courseScore >= 0.45) {
      results.push({
        type: "course",
        label: `${course.prefix} ${course.number}`,
        detail: course.title,
        href: `/course/${course.prefix}/${course.number}`,
        score: courseScore,
      });
    }

    for (const token of entry.tokens.slice(2)) {
      const commaIndex = token.indexOf(",");
      if (commaIndex <= 0 || commaIndex === token.length - 1) continue;
      const lastName = token.slice(0, commaIndex).trim();
      const firstName = token.slice(commaIndex + 1).trim();
      const key = `${lastName},${firstName}`.toLowerCase();
      if (instructorKeys.has(key)) continue;
      const instructorScore = similarity(query, `${firstName} ${lastName}`);
      if (instructorScore >= 0.45) {
        instructorKeys.add(key);
        results.push({
          type: "instructor",
          label: `${lastName}, ${firstName}`,
          detail: "Instructor",
          href: `/instructor/${toInstructorSlug(firstName, lastName)}`,
          score: instructorScore,
        });
      }
    }
  }

  return results
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .slice(0, 6);
}

export default function SimilarSearches({ query }: { query: string }) {
  const [results, setResults] = useState<SimilarResult[]>([]);

  useEffect(() => {
    let active = true;
    void fetchManifest()
      .then((manifest) => {
        if (active) setResults(findSimilarResults(manifest, query));
      })
      .catch(() => {
        if (active) setResults([]);
      });
    return () => {
      active = false;
    };
  }, [query]);

  if (results.length === 0) return null;

  return (
    <section className="mt-8 text-left">
      <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-jungle-vine dark:text-ui-accent">
        Did you mean?
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {results.map((result) => (
          <Link
            key={`${result.type}-${result.href}`}
            href={result.href}
            className="border-2 border-jungle-tan-dark/40 bg-jungle-tan/50 px-4 py-3 font-mono transition hover:border-primary hover:bg-jungle-tan-light dark:border-ui-border dark:bg-ui-raised dark:hover:border-ui-accent dark:hover:bg-ui-raised"
          >
            <span className="block text-sm font-bold text-primary dark:text-ui-text">{result.label}</span>
            <span className="mt-1 block text-xs text-jungle-bark/70 dark:text-ui-muted">{result.detail}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
