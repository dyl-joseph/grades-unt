"use client";

import { useCart } from "@/context/CartContext";
import type { CartItem } from "@/lib/types";

interface AddToCartButtonProps {
  item: CartItem;
}

export default function AddToCartButton({ item }: AddToCartButtonProps) {
  const { addCourse, removeCourse, isInCart } = useCart();
  const inCart = isInCart(item.courseId);

  return (
    <button
      onClick={() => (inCart ? removeCourse(item.courseId) : addCourse(item))}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
        inCart
          ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
          : "border-green-300 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
      }`}
    >
      {inCart ? (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Remove
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add to Cart
        </>
      )}
    </button>
  );
}
