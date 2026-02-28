"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartIcon() {
  const { items } = useCart();
  const count = items.length;

  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center rounded-lg p-1.5 text-gray-600 transition-colors hover:text-primary dark:text-green-300 dark:hover:text-jungle-leaf"
      aria-label={`Shopping cart with ${count} items`}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
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
