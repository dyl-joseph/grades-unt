"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import SearchBar from "./SearchBar";
import BookmarkIcon from "./BookmarkIcon";

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-jungle-tan-dark/30 bg-jungle-tan/90 backdrop-blur-md transition-colors duration-700 dark:border-green-900/50 dark:bg-black/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-5 px-5">
        <Link
          href="/"
          className="shrink-0 text-[34px] font-bold text-primary dark:text-jungle-leaf"
        >
          UNT Grades
        </Link>
        {!isHome && (
          <div className={`hidden max-w-md flex-1 transition-all duration-300 sm:block ${scrolled ? "pointer-events-none max-h-0 opacity-0" : "max-h-12 opacity-100"}`}>
            <SearchBar compact />
          </div>
        )}
        <div className="flex items-center gap-4">
          <BookmarkIcon />
          <ThemeToggle />
        </div>
      </div>
      {!isHome && (
        <div className={`border-t border-green-100 px-4 py-2 transition-all duration-300 sm:hidden dark:border-green-900 ${scrolled ? "pointer-events-none max-h-0 overflow-hidden border-t-0 py-0 opacity-0" : "max-h-20 opacity-100"}`}>
          <SearchBar compact />
        </div>
      )}
    </nav>
  );
}
