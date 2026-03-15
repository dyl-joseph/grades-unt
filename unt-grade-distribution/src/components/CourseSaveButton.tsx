"use client";

import SaveForLaterButton from "@/components/SaveForLaterButton";
import type { CartItem } from "@/lib/types";

/**
 * Client-side wrapper to render SaveForLaterButton on the server-rendered course page.
 * Receives pre-computed saved-course data as props.
 */
export default function CourseSaveButton({ item }: { item: CartItem }) {
  return <SaveForLaterButton item={item} />;
}
