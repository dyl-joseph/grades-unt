import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
      {/* Hero section */}
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-gradient-to-br from-jungle-canopy via-primary to-jungle-moss px-6 py-16 text-center shadow-xl sm:px-12 sm:py-24">
        <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 5 C25 15, 10 20, 5 30 C10 25, 20 28, 30 20 C40 28, 50 25, 55 30 C50 20, 35 15, 30 5Z\' fill=\'%2300ff00\' fill-opacity=\'0.3\'/%3E%3C/svg%3E")', backgroundSize: '60px 60px' }} />
        <h1 className="relative mb-3 text-3xl font-bold text-white sm:text-5xl">
          🌴 UNT Grade Distribution
        </h1>
        <p className="relative mb-8 text-lg text-accent/90 sm:text-xl">
          Explore the jungle of grades
        </p>
        <div className="mx-auto flex justify-center">
          <SearchBar autoFocus />
        </div>
      </div>

      {/* Subtitle */}
      <p className="mt-8 text-center text-sm text-jungle-vine dark:text-accent">
        Search by course (e.g., &ldquo;ACCT 2010&rdquo;) or professor name
        (e.g., &ldquo;Moore&rdquo;)
      </p>
    </div>
  );
}
