"use client";

import { useState, useCallback } from "react";

interface ShareButtonProps {
  url: string;
  compact?: boolean;
}

export default function ShareButton({ url, compact = false }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const fullUrl = typeof window !== "undefined"
        ? `${window.location.origin}${url}`
        : url;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const fullUrl = `${window.location.origin}${url}`;
      const textarea = document.createElement("textarea");
      textarea.value = fullUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url]);

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex select-none items-center gap-1.5 rounded-lg border transition-all ${
        copied
          ? "border-green-400 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-300"
          : "border-jungle-tan-dark/30 bg-jungle-tan-light text-gray-600 hover:border-primary/40 hover:text-primary dark:border-green-800/50 dark:bg-jungle-canopy/60 dark:text-green-300 dark:hover:border-green-600 dark:hover:text-green-200"
      } ${compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"}`}
      title="Copy link to clipboard"
    >
      {copied ? (
        <>
          {/* Checkmark icon */}
          <svg className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          {/* Share/link icon */}
          <svg className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}
