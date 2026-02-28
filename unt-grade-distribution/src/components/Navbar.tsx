"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import SearchBar from "./SearchBar";
import CartIcon from "./CartIcon";

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <nav className="sticky top-0 z-50 border-b border-green-200 bg-green-50/90 backdrop-blur-md dark:border-green-900 dark:bg-jungle-canopy/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="shrink-0 text-lg font-bold text-primary dark:text-jungle-leaf"
        >
          🌿 UNT Grades
        </Link>
        {!isHome && (
          <div className="hidden max-w-md flex-1 sm:block">
            <SearchBar compact />
          </div>
        )}
        <div className="flex items-center gap-3">
          <CartIcon />
          <ThemeToggle />
        </div>
      </div>
      {!isHome && (
        <div className="border-t border-green-100 px-4 py-2 sm:hidden dark:border-green-900">
          <SearchBar compact />
        </div>
      )}
    </nav>
  );
}
