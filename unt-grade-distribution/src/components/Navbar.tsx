"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import SearchBar from "./SearchBar";

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-700 dark:bg-gray-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="shrink-0 text-lg font-bold text-primary dark:text-primary-light"
        >
          UNT Grades
        </Link>
        {!isHome && (
          <div className="hidden max-w-md flex-1 sm:block">
            <SearchBar compact />
          </div>
        )}
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>
      {!isHome && (
        <div className="border-t border-gray-100 px-4 py-2 sm:hidden dark:border-gray-800">
          <SearchBar compact />
        </div>
      )}
    </nav>
  );
}
