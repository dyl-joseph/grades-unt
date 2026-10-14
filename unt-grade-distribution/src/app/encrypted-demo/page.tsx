import type { Metadata } from "next";
import EncryptedDemoClient from "./EncryptedDemoClient";
import { pageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `Encrypted Data Demo | ${SITE_NAME}`,
  description: "Demo of how UNT Grades decrypts course grade data in the browser.",
  path: "/encrypted-demo",
});

export default function EncryptedDemoPage() {
  return <EncryptedDemoClient />;
}
