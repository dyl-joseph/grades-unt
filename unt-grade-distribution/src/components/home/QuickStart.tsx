"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchManifest } from "@/lib/encryptedData";

const COURSES = [
  { prefix: "ACCT", number: "2010", title: "Accounting Principles I" },
  { prefix: "CSCE", number: "1030", title: "Computer Science I" },
  { prefix: "MATH", number: "1710", title: "Calculus I" },
  { prefix: "BIOL", number: "1710", title: "Biology for Science Majors I" },
];

export default function QuickStart() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function surpriseMe() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const manifest = await fetchManifest();
      // The manifest contains courses with recorded grade outcomes. Deduplicate
      // so each course gets the same chance even if an older manifest repeats it.
      const courses = Array.from(new Map(manifest
        .filter(({ preview }) => preview.prefix.trim() && preview.number.trim())
        .map(({ preview }) => [`${preview.prefix}|${preview.number}`, preview])).values());
      if (courses.length === 0) throw new Error("No courses available");
      const course = courses[Math.floor(Math.random() * courses.length)];
      router.push(`/course/${encodeURIComponent(course.prefix)}/${encodeURIComponent(course.number)}`);
    } catch {
      setError("Couldn't pick a class right now. Give it another try, or search above.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <nav aria-label="Example courses" className="flex flex-col items-center gap-3">
      <p className="text-sm font-semibold text-jungle-bark dark:text-ui-accent">
        Try a course
      </p>
      <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        {COURSES.map((course) => (
          <li key={`${course.prefix}-${course.number}`}>
            <Link
              href={`/course/${course.prefix}/${course.number}`}
              className="course-play-card block h-full rounded-xl border border-jungle-tan-dark/30 bg-jungle-tan-light px-4 py-3 text-left shadow-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-ui-border dark:bg-ui-surface dark:hover:border-ui-accent"
            >
              <span className="block text-sm font-bold text-primary dark:text-ui-accent">
                {course.prefix} {course.number}
              </span>
              <span className="block text-xs text-jungle-bark/70 dark:text-ui-muted">{course.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={surpriseMe}
        disabled={loading}
        className="course-play-card mt-1 inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/30 px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:cursor-wait disabled:opacity-60 dark:border-ui-accent/40 dark:text-ui-accent dark:hover:bg-ui-selected"
      >
        <span aria-hidden="true">↝</span>
        {loading ? "Picking your next discovery…" : "Surprise me"}
      </button>
      <p role="status" className="max-w-md text-center text-sm text-jungle-bark dark:text-ui-muted">{error}</p>
    </nav>
  );
}
