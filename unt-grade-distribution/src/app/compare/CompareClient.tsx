"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { aggregateGrades, toChartData, type ChartDataPoint, type GradeData } from "@/lib/grades";
import GradeChart from "@/components/GradeChart";
import { useDebounce } from "@/hooks/useDebounce";
import type { SearchResult } from "@/lib/types";

type CompareType = "course" | "instructor";
type CourseSuggestion = SearchResult["courses"][number];
type InstructorSuggestion = SearchResult["instructors"][number];
type Suggestion = CourseSuggestion | InstructorSuggestion;

type SectionsResponse =
  | { sections: GradeData[]; course?: { prefix: string; number: string; title: string } }
  | { sections: GradeData[]; instructor?: { id: number; firstName: string; lastName: string } };

function isCourseSuggestion(item: Suggestion): item is CourseSuggestion {
  return "prefix" in item && "number" in item;
}

export default function CompareClient() {
  const sp = useSearchParams();
  const typeParam = sp?.get("type") ?? undefined;
  const a = sp?.get("a") ?? undefined;
  const paramsAvailable = sp !== null;
  const type = (typeParam === "course" || typeParam === "instructor" ? typeParam : undefined) as
    | CompareType
    | undefined;

  const invalidParams = paramsAvailable && (!type || !a);

  const [leftSearch, setLeftSearch] = useState("");
  const [leftResults, setLeftResults] = useState<Suggestion[]>([]);
  const [leftSelected, setLeftSelected] = useState<Suggestion | null>(null);
  const [leftData, setLeftData] = useState<{ chartData: ChartDataPoint[]; label: string } | null>(null);
  const [leftFocused, setLeftFocused] = useState(false);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [rightData, setRightData] = useState<{ chartData: ChartDataPoint[]; label: string } | null>(null);
  const [rightFocused, setRightFocused] = useState(false);

  const leftDebounced = useDebounce(leftSearch, 250);
  const rightDebounced = useDebounce(search, 250);

  const apiForEntity = useCallback(
    (entityType: CompareType, entity: Suggestion | string) => {
      if (entityType === "course") {
        if (typeof entity === "string") {
          const [prefix, number] = entity.split(":");
          return `/api/course/${prefix}/${number}`;
        }
        if (!isCourseSuggestion(entity)) return null;
        return `/api/course/${entity.prefix}/${entity.number}`;
      }
      // instructor
      if (typeof entity === "string") return `/api/instructor/${entity}`;
      if (isCourseSuggestion(entity)) return null;
      return `/api/instructor/${entity.id}`;
    },
    []
  );

  const labelForEntity = useCallback(
    (entityType: CompareType, entity: Suggestion | string, data?: SectionsResponse | null) => {
      if (entityType === "course") {
        if (data && "course" in data && data.course) {
          return `${data.course.prefix} ${data.course.number} — ${data.course.title}`;
        }
        if (typeof entity === "string") {
          const [prefix, number] = entity.split(":");
          return `${prefix} ${number}`;
        }
        if (isCourseSuggestion(entity)) {
          return `${entity.prefix} ${entity.number} — ${entity.title}`;
        }
        return "Course";
      }

      if (data && "instructor" in data && data.instructor) {
        return `${data.instructor.firstName} ${data.instructor.lastName}`;
      }
      if (typeof entity === "string") return `Instructor #${entity}`;
      if (!isCourseSuggestion(entity)) return `${entity.firstName} ${entity.lastName}`;
      return "Instructor";
    },
    []
  );

  // Fetch helper
  const fetchEntity = useCallback(async (url: string, signal?: AbortSignal) => {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    return (await res.json()) as SectionsResponse;
  }, []);

  // Left data effect
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!type || !a) return;

      const entity = leftSelected ?? a;
      const url = apiForEntity(type, entity);
      if (!url) return;

      const data = await fetchEntity(url);
      const sections = data?.sections ?? [];
      const aggregate = aggregateGrades(sections);
      const chartData = toChartData(aggregate);
      const label = labelForEntity(type, entity, data);

      if (mounted) setLeftData({ chartData, label });
    }
    load();
    return () => { mounted = false; };
  }, [a, apiForEntity, fetchEntity, labelForEntity, leftSelected, type]);

  // Right data effect
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!type) return;
      if (!selected) {
        if (mounted) setRightData(null);
        return;
      }

      const url = apiForEntity(type, selected);
      if (!url) return;

      const data = await fetchEntity(url);
      const sections = data?.sections ?? [];
      const aggregate = aggregateGrades(sections);
      const chartData = toChartData(aggregate);
      const label = labelForEntity(type, selected, data);
      if (mounted) setRightData({ chartData, label });
    }
    load();
    return () => { mounted = false; };
  }, [apiForEntity, fetchEntity, labelForEntity, selected, type]);

  const fetchSuggestions = useCallback(
    async (q: string, signal?: AbortSignal) => {
      if (!type) return [];
      if (q.trim().length < 2) return [];
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal });
      if (!res.ok) return [];
      const data = (await res.json()) as SearchResult;
      return (type === "course" ? data.courses : data.instructors) as Suggestion[];
    },
    [type]
  );

  useEffect(() => {
    if (!type) return;
    const controller = new AbortController();
    fetchSuggestions(leftDebounced.trim(), controller.signal)
      .then((items) => setLeftResults(items))
      .catch(() => setLeftResults([]));
    return () => controller.abort();
  }, [fetchSuggestions, leftDebounced, type]);

  useEffect(() => {
    if (!type) return;
    const controller = new AbortController();
    fetchSuggestions(rightDebounced.trim(), controller.signal)
      .then((items) => setResults(items))
      .catch(() => setResults([]));
    return () => controller.abort();
  }, [fetchSuggestions, rightDebounced, type]);

  const clearLeft = () => { setLeftSelected(null); setLeftData(null); setLeftSearch(""); setLeftResults([]); };
  const clearRight = () => { setSelected(null); setRightData(null); setSearch(""); setResults([]); };

  const leftOpen = leftFocused && leftResults.length > 0;
  const rightOpen = rightFocused && results.length > 0;
  const rightOpenList = useMemo(() => (rightOpen ? results : []), [results, rightOpen]);
  const leftOpenList = useMemo(() => (leftOpen ? leftResults : []), [leftOpen, leftResults]);

  if (!paramsAvailable) return (
    <main className="flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-4">Compare</h1>
      <div className="text-gray-600">Loading compare parameters...</div>
    </main>
  );

  if (invalidParams) return (
    <main className="flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-4">Compare</h1>
      <div className="text-red-600">Invalid compare parameters</div>
    </main>
  );

  return (
    <main className="flex flex-col p-4 md:h-screen md:overflow-hidden">
      <header className="w-full sticky top-0 z-10 flex justify-center bg-transparent py-4">
        <h1 className="text-4xl md:text-5xl font-bold">Compare {type === "course" ? "Courses" : "Instructors"}</h1>
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl mt-2 md:-mt-20">

        <div className="flex-1 border rounded-xl bg-[#F5F2EE] dark:bg-jungle-canopy/60 p-6 shadow-sm min-h-[300px] mb-8 md:mb-0">
          <div className="w-full mb-4 relative">
            <div className="relative">
              <input
                type="text"
                value={leftSearch}
                onChange={(e) => setLeftSearch(e.target.value)}
                onFocus={() => { setLeftFocused(true); setRightFocused(false); }}
                onBlur={() => setLeftFocused(false)}
                placeholder={leftSelected ? "Change left selection..." : `Search left ${type === "course" ? "course" : "instructor"}...`}
                className="w-full px-4 pr-10 py-2 rounded-2xl border border-gray-300 focus:border-blue-500 focus:outline-none text-gray-900 placeholder:text-gray-500 dark:text-green-100"
              />
              <button type="button" onClick={() => { clearLeft(); setLeftFocused(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-green-100 dark:hover:bg-gray-700" aria-label="Clear left input">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {leftOpen && (
              <ul className="absolute left-0 right-0 z-50 top-full mt-2 bg-[#EFEAE6] dark:bg-jungle-canopy/90 border border-gray-200 rounded shadow max-h-60 overflow-y-auto text-gray-900 dark:text-green-100 custom-scrollbar">
                {leftOpenList.map((item) => (
                  <li key={item.id} className="px-3 py-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-green-800" onMouseDown={(e) => {
                    e.preventDefault();
                    setLeftSelected(item);
                    setLeftSearch("");
                    setLeftResults([]);
                    setLeftFocused(false);
                  }}>
                    {type === "course" && isCourseSuggestion(item)
                      ? `${item.prefix} ${item.number} — ${item.title}`
                      : !isCourseSuggestion(item)
                        ? `${item.lastName}, ${item.firstName}`
                        : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {leftData ? (
            <>
              {leftData.label && <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-green-100">{leftData.label}</h3>}
              <div className="bg-[#FBFAF8] dark:bg-jungle-canopy/70 rounded p-2">
                <GradeChart data={leftData.chartData} height={280} mode="percentage" />
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500">Loading aggregate graph...</div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center border rounded-xl bg-[#F5F2EE] dark:bg-jungle-canopy/60 p-6 min-h-[300px]">
          <div className="w-full mb-4 relative">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => { setRightFocused(true); setLeftFocused(false); }}
                onBlur={() => setRightFocused(false)}
                placeholder={`Search for another ${type === "course" ? "course" : "instructor"}...`}
                className="w-full px-4 pr-10 py-2 rounded-2xl border border-gray-300 focus:border-blue-500 focus:outline-none text-gray-900 placeholder:text-gray-500 dark:text-green-100"
              />
              <button type="button" onClick={() => { clearRight(); setRightFocused(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-green-100 dark:hover:bg-gray-700" aria-label="Clear right input">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {rightOpen && (
              <ul className="absolute left-0 right-0 z-50 top-full mt-2 bg-[#EFEAE6] dark:bg-jungle-canopy/90 border border-gray-200 rounded shadow max-h-60 overflow-y-auto text-gray-900 dark:text-green-100 w-full custom-scrollbar">
                {rightOpenList.map((item) => (
                  <li key={item.id} className="px-3 py-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-green-800" onMouseDown={(e) => {
                    e.preventDefault();
                    setSelected(item);
                    setSearch("");
                    setResults([]);
                    setRightFocused(false);
                  }}>
                    {type === "course" && isCourseSuggestion(item)
                      ? `${item.prefix} ${item.number} — ${item.title}`
                      : !isCourseSuggestion(item)
                        ? `${item.lastName}, ${item.firstName}`
                        : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center w-full">
            {selected && rightData ? (
              <div className="w-full">
                {rightData.label && <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-green-100">{rightData.label}</h3>}
                <div className="bg-[#FBFAF8] dark:bg-jungle-canopy/70 rounded p-2">
                  <GradeChart data={rightData.chartData} height={280} mode="percentage" />
                </div>
              </div>
            ) : (
              <span className="text-gray-400 text-lg">No selection yet</span>
            )}
          </div>
        </div>

      </div>
    </div>
    </main>
  );
}
