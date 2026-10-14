import type { Metadata } from "next";
import CartClient from "./CartClient";
import { pageMetadata, SITE_NAME } from "@/lib/seo";

// Saved courses live in the visitor's browser, so there is nothing here for search engines.
export const metadata: Metadata = pageMetadata({
  title: `Saved Courses | ${SITE_NAME}`,
  description: "Courses you've saved on UNT Grades, with combined grade distributions and a downloadable PDF summary.",
  path: "/cart",
  noindex: true,
});

export default function CartPage() {
  return <CartClient />;
}
