import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-700 dark:bg-gray-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg font-bold text-primary dark:text-primary-light"
        >
          UNT Grades
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            Home
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
