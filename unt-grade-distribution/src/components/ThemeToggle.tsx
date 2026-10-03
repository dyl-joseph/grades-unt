"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { isDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystemTheme = () => {
      document.documentElement.classList.toggle("dark", preference.matches);
    };

    applySystemTheme();
    preference.addEventListener("change", applySystemTheme);
    const timeout = window.setTimeout(() => setMounted(true), 0);

    return () => {
      window.clearTimeout(timeout);
      preference.removeEventListener("change", applySystemTheme);
    };
  }, []);

  // Manual changes last for this page session; the OS remains the default.
  const toggle = () => {
    const root = document.documentElement;
    root.classList.add("theme-changing");
    // Establish the transition styles before changing the palette.
    void window.getComputedStyle(document.body).backgroundColor;
    root.classList.toggle("dark", !isDark);
    window.setTimeout(() => root.classList.remove("theme-changing"), 750);
  };

  if (!mounted) {
    return <div className="h-[46px] w-[46px]" />;
  }

  return (
    <button
      onClick={toggle}
      className="rounded-lg p-[8px] text-gray-600 transition-colors dark:text-ui-muted"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        // Sun icon
        <svg
          className="h-[30px] w-[30px]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        // Moon icon
        <svg
          className="h-[30px] w-[30px]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}
