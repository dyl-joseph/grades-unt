"use client";

export type SemesterCount = 1 | 2;

type SemesterSelectProps = {
  id: string;
  labels: string[];
  value: string;
  onChange: (value: string) => void;
};

export function SemesterSelect({ id, labels, value, onChange }: SemesterSelectProps) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600 dark:text-green-200/70">
      Semester
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 rounded-lg border border-jungle-tan-dark/40 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-green-800 dark:bg-green-950/60 dark:text-green-100 dark:focus:border-green-500 sm:w-auto"
      >
        <option value="all">All semesters</option>
        {labels.map((label) => (
          <option key={label} value={label}>{label}</option>
        ))}
      </select>
    </label>
  );
}

type SemesterWindowControlsProps = {
  id: string;
  labels: string[];
  anchor: string;
  count: SemesterCount;
  onAnchorChange: (value: string) => void;
  onCountChange: (value: SemesterCount) => void;
};

export function SemesterWindowControls({
  id,
  labels,
  anchor,
  count,
  onAnchorChange,
  onCountChange,
}: SemesterWindowControlsProps) {
  if (!labels.length) return null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
      <label htmlFor={id} className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-gray-600 dark:text-green-200/70 sm:flex-none">
        Starting semester
        <select
          id={id}
          value={anchor}
          onChange={(event) => onAnchorChange(event.target.value)}
          className="h-10 w-full min-w-0 rounded-lg border border-jungle-tan-dark/40 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-green-800 dark:bg-green-950/60 dark:text-green-100 dark:focus:border-green-500 sm:w-auto"
        >
          {labels.map((label) => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>
      </label>
      <fieldset className="w-full min-w-0 sm:w-auto">
        <legend className="mb-1 text-xs font-medium text-gray-600 dark:text-green-200/70">Show</legend>
        <div className="grid w-full grid-cols-2 rounded-lg border border-jungle-tan-dark/40 bg-white p-1 shadow-sm dark:border-green-800 dark:bg-green-950/60">
          {([1, 2] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onCountChange(value)}
              disabled={value === 2 && labels.length < 2}
              aria-pressed={count === value}
              className={`flex h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                count === value
                  ? "bg-primary text-white dark:bg-green-700"
                  : "text-gray-600 hover:bg-jungle-tan-dark/15 dark:text-green-200/70 dark:hover:bg-green-900/50"
              }`}
            >
              {value} semester{value === 2 ? "s" : ""}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
