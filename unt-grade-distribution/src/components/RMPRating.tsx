"use client";

import { useEffect, useState } from "react";
import { getRMPProfileUrl, type RMPProfessor } from "@/lib/rmp";

interface RMPRatingProps {
  firstName: string;
  lastName: string;
}

export default function RMPRating({ firstName, lastName }: RMPRatingProps) {
  const [loading, setLoading] = useState(true);
  const [professor, setProfessor] = useState<RMPProfessor | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchRMP() {
      try {
        const res = await fetch(
          `/api/rmp?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`
        );
        const data = await res.json();

        if (data.found && data.professor) {
          setProfessor(data.professor);
        }
      } catch (err) {
        console.error("Failed to fetch RMP data:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchRMP();
  }, [firstName, lastName]);

  if (loading) {
    return (
      <div className="animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-green-800/30 dark:bg-green-900/20">
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-green-800/50"></div>
        <div className="mt-2 h-8 w-16 rounded bg-gray-200 dark:bg-green-800/50"></div>
      </div>
    );
  }

  if (error || !professor) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-green-800/30 dark:bg-green-900/20">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-green-300/60">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>No RateMyProfessors data found</span>
        </div>
      </div>
    );
  }

  const ratingColor =
    professor.avgRating >= 4
      ? "text-green-600 dark:text-green-400"
      : professor.avgRating >= 3
        ? "text-yellow-600 dark:text-yellow-400"
        : professor.avgRating >= 2
          ? "text-orange-600 dark:text-orange-400"
          : "text-red-600 dark:text-red-400";

  const difficultyColor =
    professor.avgDifficulty <= 2
      ? "text-green-600 dark:text-green-400"
      : professor.avgDifficulty <= 3
        ? "text-yellow-600 dark:text-yellow-400"
        : professor.avgDifficulty <= 4
          ? "text-orange-600 dark:text-orange-400"
          : "text-red-600 dark:text-red-400";

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-green-800/30 dark:bg-green-900/20">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-green-200">
          RateMyProfessors
        </h3>
        <a
          href={getRMPProfileUrl(professor.legacyId)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline dark:text-jungle-leaf"
        >
          View Profile →
        </a>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Overall Rating */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${ratingColor}`}>
            {professor.avgRating.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 dark:text-green-300/60">
            Rating
          </div>
        </div>

        {/* Difficulty */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${difficultyColor}`}>
            {professor.avgDifficulty.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 dark:text-green-300/60">
            Difficulty
          </div>
        </div>

        {/* Would Take Again */}
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-700 dark:text-green-200">
            {professor.wouldTakeAgainPercent >= 0
              ? `${Math.round(professor.wouldTakeAgainPercent)}%`
              : "N/A"}
          </div>
          <div className="text-xs text-gray-500 dark:text-green-300/60">
            Take Again
          </div>
        </div>
      </div>

      <div className="mt-3 text-center text-xs text-gray-400 dark:text-green-400/50">
        Based on {professor.numRatings} rating
        {professor.numRatings !== 1 ? "s" : ""}
      </div>

      {/* Tags */}
      {professor.tags && professor.tags.length > 0 && (
        <div className="mt-4 border-t border-gray-200 pt-3 dark:border-green-800/30">
          <div className="flex flex-wrap gap-1.5">
            {professor.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700 dark:bg-green-800/40 dark:text-green-200"
                >
                  {tag}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
