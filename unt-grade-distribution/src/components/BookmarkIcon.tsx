"use client";

import Link from "next/link";
import { useSavedCourses } from "@/context/SavedCoursesContext";

export default function BookmarkIcon() {
  const { items } = useSavedCourses();
  const count = items.length;

  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center rounded-lg p-2 text-gray-600 transition-colors hover:text-primary dark:text-green-300 dark:hover:text-jungle-leaf"
      aria-label={`Saved courses with ${count} items`}
    >
      <svg
        className="h-[30px] w-[32px]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        style={{ transform: "scaleX(1.1)" }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 21l-5-3-5 3V5a2 2 0 012-2h6a2 2 0 012 2v16z"
        />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-jungle-gold px-1 text-[10px] font-bold text-jungle-canopy">
          {count}
        </span>
      )}
    </Link>
  );
}
