"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { downloadCartPDF } from "@/lib/pdf";
import GpaBadge from "@/components/GpaBadge";
import GradeChart from "@/components/GradeChart";
import { toChartData, calculateGPA } from "@/lib/grades";
import type { CartItem } from "@/lib/types";

export default function CartPage() {
  const { items, removeCourse, clearCart } = useCart();

  const handleDownload = () => {
    if (items.length === 0) return;
    downloadCartPDF(items);
  };

  // Compute overall averages
  const overallGPA =
    items.length > 0
      ? calculateGPA(
          items.reduce(
            (acc, item) => ({
              gradeA: acc.gradeA + item.gradeA,
              gradeB: acc.gradeB + item.gradeB,
              gradeC: acc.gradeC + item.gradeC,
              gradeD: acc.gradeD + item.gradeD,
              gradeF: acc.gradeF + item.gradeF,
              gradeP: acc.gradeP + item.gradeP,
              gradeNP: acc.gradeNP + item.gradeNP,
              gradeW: acc.gradeW + item.gradeW,
              gradeI: acc.gradeI + item.gradeI,
              totalEnroll: acc.totalEnroll + item.totalEnroll,
            }),
            {
              gradeA: 0,
              gradeB: 0,
              gradeC: 0,
              gradeD: 0,
              gradeF: 0,
              gradeP: 0,
              gradeNP: 0,
              gradeW: 0,
              gradeI: 0,
              totalEnroll: 0,
            }
          )
        )
      : null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="text-6xl">🛒</div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-green-100">
          Your cart is empty
        </h1>
        <p className="mt-2 text-gray-500 dark:text-green-200/60">
          Add courses to compare grade distributions and download a PDF summary.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-jungle-moss"
        >
          Browse Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-green-100 sm:text-3xl">
            My Courses
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-green-200/60">
            {items.length} course{items.length !== 1 ? "s" : ""} saved
            {overallGPA !== null && (
              <>
                {" · "}Combined GPA: <GpaBadge gpa={overallGPA} />
              </>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-jungle-moss"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
          <button
            onClick={clearCart}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Course cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item: CartItem) => (
          <CartCourseCard
            key={item.courseId}
            item={item}
            onRemove={() => removeCourse(item.courseId)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Individual course card ──────────────────────────── */
function CartCourseCard({
  item,
  onRemove,
}: {
  item: CartItem;
  onRemove: () => void;
}) {
  const chartData = toChartData(item);

  return (
    <div className="relative rounded-xl border border-jungle-tan-dark/30 bg-jungle-tan-light p-4 shadow-sm dark:border-green-900 dark:bg-jungle-canopy/60">
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute right-2 top-2 rounded-md p-1 text-gray-400 transition-colors hover:text-red-500 dark:text-green-300/50 dark:hover:text-red-400"
        aria-label="Remove from cart"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Course info */}
      <Link
        href={`/course/${item.prefix}/${item.number}`}
        className="group"
      >
        <h3 className="font-semibold text-gray-900 group-hover:text-primary dark:text-green-100 dark:group-hover:text-jungle-leaf">
          {item.prefix} {item.number}
        </h3>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-green-200/60">
          {item.title}
        </p>
      </Link>

      {/* Stats */}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-green-200/60">
        <span className="flex items-center gap-1">
          GPA: <GpaBadge gpa={item.gpa} />
        </span>
        <span>{item.sectionCount} sections</span>
        <span>{item.totalEnroll.toLocaleString()} students</span>
      </div>

      {/* Mini chart */}
      <div className="mt-3">
        <GradeChart data={chartData} />
      </div>
    </div>
  );
}
