import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { HOME_DESCRIPTION, HOME_TITLE, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: "/" });

export default function Home() {
  return <HomeClient />;
}
