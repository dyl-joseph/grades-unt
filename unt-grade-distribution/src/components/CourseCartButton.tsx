"use client";

import AddToCartButton from "@/components/AddToCartButton";
import type { CartItem } from "@/lib/types";

/**
 * Client-side wrapper to render AddToCartButton on the server-rendered course page.
 * Receives pre-computed cart item data as props.
 */
export default function CourseCartButton({ item }: { item: CartItem }) {
  return <AddToCartButton item={item} />;
}
