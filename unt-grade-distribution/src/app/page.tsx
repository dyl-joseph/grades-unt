import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
      {/* Hero section */}
      <div className="w-full max-w-4xl rounded-2xl bg-gradient-to-br from-primary to-primary-dark px-6 py-16 text-center shadow-xl sm:px-12 sm:py-24">
        <h1 className="mb-3 text-3xl font-bold text-white sm:text-5xl">
          UNT Grade Distribution
        </h1>
        <p className="mb-8 text-lg text-white/80 sm:text-xl">
          See how students did in any class
        </p>
        <div className="mx-auto flex justify-center">
          <SearchBar autoFocus />
        </div>
      </div>

      {/* Subtitle */}
      <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Search by course (e.g., &ldquo;ACCT 2010&rdquo;) or professor name
        (e.g., &ldquo;Moore&rdquo;)
      </p>
    </div>
  );
}
