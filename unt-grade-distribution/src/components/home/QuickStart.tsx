import Link from "next/link";

const COURSES = [
  { prefix: "ACCT", number: "2010", title: "Account Prin I" },
  { prefix: "CSCE", number: "1030", title: "Computer Science I" },
  { prefix: "MATH", number: "1710", title: "Calculus I" },
  { prefix: "BIOL", number: "1710", title: "Biol Sci Majors I" },
];

export default function QuickStart() {
  return (
    <nav aria-label="Example courses" className="flex flex-col items-center gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jungle-vine dark:text-ui-accent">
        Try a course
      </p>
      <ul className="flex flex-wrap justify-center gap-x-7 gap-y-3">
        {COURSES.map((course) => (
          <li key={`${course.prefix}-${course.number}`}>
            <Link
              href={`/course/${course.prefix}/${course.number}`}
              className="block border-l-2 border-jungle-tan-dark pl-3 text-left transition-colors hover:border-primary dark:border-ui-border dark:hover:border-ui-accent"
            >
              <span className="block font-mono text-sm font-bold text-primary dark:text-ui-accent">
                {course.prefix} {course.number}
              </span>
              <span className="block text-xs text-jungle-bark/70 dark:text-ui-muted">{course.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
