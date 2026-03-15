"use client";

import { useSavedCourses } from "@/context/SavedCoursesContext";
import type { CartItem } from "@/lib/types";

interface SaveForLaterButtonProps {
  item: CartItem;
}

export default function SaveForLaterButton({
  item,
}: SaveForLaterButtonProps) {
  const { addCourse, removeCourse, isSaved } = useSavedCourses();
  const isBookmarked = isSaved(item.courseId);

  return (
    <button
      onClick={() =>
        isBookmarked ? removeCourse(item.courseId) : addCourse(item)
      }
      aria-label={isBookmarked ? "Remove bookmark" : "Save bookmark"}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
        isBookmarked
          ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
          : "border-green-300 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
      }`}
    >
      {isBookmarked ? (
        <>
          <svg
            className="h-4 w-[18px]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ transform: "scaleX(1.125)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 21l-5-3-5 3V5a2 2 0 012-2h6a2 2 0 012 2v16z"
            />
          </svg>
          Saved
        </>
      ) : (
        <>
          <svg
            className="h-4 w-[18px]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            style={{ transform: "scaleX(1.125)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 21l-5-3-5 3V5a2 2 0 012-2h6a2 2 0 012 2v16z"
            />
          </svg>
          Save
        </>
      )}
    </button>
  );
}
