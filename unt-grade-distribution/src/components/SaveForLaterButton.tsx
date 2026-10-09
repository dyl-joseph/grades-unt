"use client";

import { useSavedCourses } from "@/context/SavedCoursesContext";
import type { CartItem } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface SaveForLaterButtonProps {
  item: CartItem;
}

export default function SaveForLaterButton({
  item,
}: SaveForLaterButtonProps) {
  const { items, addCourse, removeCourse, isSaved } = useSavedCourses();
  const isBookmarked = isSaved(item.courseId);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (!celebrating) return;
    const timer = window.setTimeout(() => setCelebrating(false), 8000);
    return () => window.clearTimeout(timer);
  }, [celebrating]);

  function toggleSave() {
    if (isBookmarked) {
      removeCourse(item.courseId);
      setCelebrating(false);
    } else {
      addCourse(item);
      if (items.length === 0) setCelebrating(true);
    }
  }

  return (
    <>
    <button
      onClick={toggleSave}
      aria-label={isBookmarked ? "Remove bookmark" : "Save bookmark"}
      className={`inline-flex select-none items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
        isBookmarked
          ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
          : "border-green-300 bg-green-50 text-green-800 hover:bg-green-100 dark:border-ui-border dark:bg-ui-selected dark:text-ui-accent dark:hover:bg-ui-selected"
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
    {celebrating && isBookmarked && createPortal(
      <div className="fixed bottom-6 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-xl border border-primary/30 bg-jungle-tan-light p-4 text-jungle-bark shadow-lg dark:border-ui-border dark:bg-ui-surface dark:text-ui-text">
        <div className="flex-1">
          <p role="status" className="font-semibold">Your semester is taking shape.</p>
          <Link href="/cart" className="mt-1 inline-block text-sm underline underline-offset-4">First class saved. See your shortlist →</Link>
        </div>
        <button type="button" onClick={() => setCelebrating(false)} aria-label="Dismiss saved-course message" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-primary/10 dark:hover:bg-ui-raised">×</button>
      </div>,
      document.body
    )}
    </>
  );
}
