import type { Metadata } from "next";
import CourseClient from "./CourseClient";
import { courseMetadata } from "@/lib/seo";

type CoursePageProps = {
  params: Promise<{ prefix: string; number: string }>;
};

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { prefix, number } = await params;
  return courseMetadata(decodeURIComponent(prefix), decodeURIComponent(number));
}

export default function CoursePage() {
  return <CourseClient />;
}
