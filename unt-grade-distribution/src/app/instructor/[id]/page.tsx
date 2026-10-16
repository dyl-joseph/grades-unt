import type { Metadata } from "next";
import InstructorClient from "./InstructorClient";
import { instructorMetadata } from "@/lib/seo";

type InstructorPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: InstructorPageProps): Promise<Metadata> {
  const { id } = await params;
  return instructorMetadata(id);
}

export default function InstructorPage() {
  return <InstructorClient />;
}
