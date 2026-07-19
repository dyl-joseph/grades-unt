"use client";

export type SemesterSelection = "all" | string[];

type SemesterCheckboxGroupProps = {
  id: string;
  labels: string[];
  value: SemesterSelection;
  onChange: (value: SemesterSelection) => void;
  label?: string;
};

export function SemesterCheckboxGroup({
  id,
  labels,
  value,
  onChange,
  label = "Semesters",
}: SemesterCheckboxGroupProps) {
  if (!labels.length) return null;

  const selected = value === "all" ? labels : value.filter((semester) => labels.includes(semester));
  const allSelected = selected.length === labels.length;

  const toggleSemester = (semester: string) => {
    const next = selected.includes(semester)
      ? selected.filter((item) => item !== semester)
      : [...selected, semester];
    onChange(next.length === labels.length ? "all" : next);
  };

  return (
    <fieldset id={id} className="w-full">
      <legend className="mb-2 text-xs font-medium text-gray-600 dark:text-green-200/70">{label}</legend>
      <div className="flex flex-wrap gap-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-jungle-tan-dark/30 bg-jungle-tan/70 px-3 py-2 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:border-primary/60 dark:border-green-900/60 dark:bg-green-950/20 dark:text-green-100">
          <input type="checkbox" checked={allSelected} onChange={(event) => onChange(event.target.checked ? "all" : [])} className="h-4 w-4 accent-primary" />
          All semesters
        </label>
        {labels.map((semester) => (
          <label key={semester} className="flex cursor-pointer items-center gap-2 rounded-lg border border-jungle-tan-dark/30 bg-jungle-tan/70 px-3 py-2 text-sm text-gray-700 shadow-sm transition-colors hover:border-primary/60 dark:border-green-900/60 dark:bg-green-950/20 dark:text-green-100">
            <input type="checkbox" checked={selected.includes(semester)} onChange={() => toggleSemester(semester)} className="h-4 w-4 accent-primary" />
            {semester}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
