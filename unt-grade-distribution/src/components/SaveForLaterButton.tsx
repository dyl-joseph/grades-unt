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
      aria-pressed={isBookmarked}
      className="action-button inline-flex select-none items-center gap-1.5 whitespace-nowrap"
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
