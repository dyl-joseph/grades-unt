export const DEFAULT_SEMESTER_YEAR = "2025";
export const DEFAULT_SEMESTER_TERM = "Fall";

const TERM_RANK = new Map([
  ["winter", 0],
  ["spring", 1],
  ["maymester", 2],
  ["summer", 3],
  ["fall", 4],
]);

type SemesterLike = {
  year?: string | number | null;
  term?: string | null;
};

export function semesterLabel(value: SemesterLike) {
  const year = String(value.year ?? "").trim();
  const term = String(value.term ?? "").trim();

  if (!year && !term) return `${DEFAULT_SEMESTER_TERM} ${DEFAULT_SEMESTER_YEAR}`;
  if (!year) return term;
  if (!term) return year;
  if (term.includes(year)) return term;
  return `${term} ${year}`;
}

function parseSemesterLabel(label: string) {
  const yearMatch = label.match(/\b(\d{4})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : Number.NEGATIVE_INFINITY;
  const lower = label.toLowerCase();
  let termRank = -1;

  for (const [term, rank] of TERM_RANK.entries()) {
    if (lower.includes(term)) {
      termRank = rank;
      break;
    }
  }

  return { year, termRank };
}

export function compareSemesterLabels(a: string, b: string) {
  const left = parseSemesterLabel(a);
  const right = parseSemesterLabel(b);

  if (left.year !== right.year) return right.year - left.year;
  if (left.termRank !== right.termRank) return right.termRank - left.termRank;
  return a.localeCompare(b);
}

export function groupBySemester<T extends SemesterLike>(items: T[]) {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const label = semesterLabel(item);
    const existing = groups.get(label);
    if (existing) existing.push(item);
    else groups.set(label, [item]);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => compareSemesterLabels(a, b))
    .map(([label, groupedItems]) => ({ label, items: groupedItems }));
}

export function semesterWindow(labels: string[], anchor: string, count: 1 | 2) {
  if (!labels.length) return [];

  const anchorIndex = labels.indexOf(anchor);
  const selectedIndex = anchorIndex === -1 ? 0 : anchorIndex;
  const startIndex = Math.min(selectedIndex, Math.max(0, labels.length - count));

  return labels.slice(startIndex, startIndex + count);
}
