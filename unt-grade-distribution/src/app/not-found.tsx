import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-green-200 dark:text-green-900">
        404
      </h1>
      <p className="mt-4 text-lg text-gray-600 dark:text-green-200/70">
        Lost in the jungle... page not found 🌴
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
      >
        Back to Home
      </Link>
    </div>
  );
}
