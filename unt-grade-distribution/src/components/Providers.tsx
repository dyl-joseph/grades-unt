"use client";

import { SavedCoursesProvider } from "@/context/SavedCoursesContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SavedCoursesProvider>{children}</SavedCoursesProvider>;
}
