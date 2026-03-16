"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { aggregateGrades, toChartData } from "@/lib/grades";
import GradeChart from "@/components/GradeChart";

export default function CompareClient() {
  const sp = useSearchParams();
  const type = sp?.get("type") ?? undefined;
  const a = sp?.get("a") ?? undefined;
  const paramsAvailable = sp !== null;
  const invalidParams = paramsAvailable && (!type || !a || (type !== "course" && type !== "instructor"));

  const [leftSearch, setLeftSearch] = useState("");
  const [leftResults, setLeftResults] = useState<any[]>([]);
  const [leftSelected, setLeftSelected] = useState<any | null>(null);
  const [leftData, setLeftData] = useState<{ chartData?: any[]; label?: string } | null>(null);
  const [leftOpen, setLeftOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [rightData, setRightData] = useState<{ chartData?: any[]; label?: string } | null>(null);
  const [rightOpen, setRightOpen] = useState(false);

  // Fetch helper
  async function fetchEntity(url: string) {
    const res = await fetch(url);
    return res.ok ? res.json() : null;
  }

  // Left data effect
  useEffect(() => {
    let mounted = true;
    async function load() {
      const source = leftSelected ?? (a ? { fromParam: a } : null);
      if (!source) return;
      let url = "";
      if (leftSelected) {
        if (type === "course") url = `/api/course/${leftSelected.prefix}/${leftSelected.number}`;
        else url = `/api/instructor/${leftSelected.id}`;
      } else {
        if (!a) return;
        if (type === "course") {
          const [prefix, number] = a.split(":");
          url = `/api/course/${prefix}/${number}`;
        } else {
          url = `/api/instructor/${a}`;
        }
      }
      const data = await fetchEntity(url);
      const sections = data?.sections ?? [];
      const aggregate = aggregateGrades(sections);
      const chartData = toChartData(aggregate);
      let label = "";
      if (type === "course") {
        label = data?.course ? `${data.course.prefix} ${data.course.number} — ${data.course.title}` : leftSelected ? `${leftSelected.prefix} ${leftSelected.number} — ${leftSelected.title ?? ""}` : "";
      } else {
        label = data?.instructor ? `${data.instructor.firstName} ${data.instructor.lastName}` : "";
      }
      if (mounted) setLeftData({ chartData, label });
    }
    load();
    return () => { mounted = false; };
  }, [a, type, leftSelected]);

  // Right data effect
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!selected) return setRightData(null);
      let url = "";
      if (type === "course") url = `/api/course/${selected.prefix}/${selected.number}`;
      else url = `/api/instructor/${selected.id}`;
      const data = await fetchEntity(url);
      const sections = data?.sections ?? [];
      const aggregate = aggregateGrades(sections);
      const chartData = toChartData(aggregate);
      const label = type === "course" ? (data?.course ? `${data.course.prefix} ${data.course.number} — ${data.course.title}` : `${selected.prefix} ${selected.number}`) : (data?.instructor ? `${data.instructor.firstName} ${data.instructor.lastName}` : "");
      if (mounted) setRightData({ chartData, label });
    }
    load();
    return () => { mounted = false; };
  }, [selected, type]);

  const doSearch = async (q: string, setter: (v: any[]) => void) => {
    if (q.length < 2) { setter([]); return; }
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) { setter([]); return; }
    const data = await res.json();
    setter(type === "course" ? (data.courses || []) : (data.instructors || []));
  };

  const handleLeftSearch = (e: React.ChangeEvent<HTMLInputElement>) => { setLeftSearch(e.target.value); };
  useEffect(() => { const t = setTimeout(() => doSearch(leftSearch, setLeftResults), 150); return () => clearTimeout(t); }, [leftSearch, type]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); };
  useEffect(() => { const t = setTimeout(() => doSearch(search, setResults), 150); return () => clearTimeout(t); }, [search, type]);

  const clearLeft = () => { setLeftSelected(null); setLeftData(null); setLeftSearch(""); setLeftResults([]); };
  const clearRight = () => { setSelected(null); setRightData(null); setSearch(""); setResults([]); };

  // keep dropdowns mutually exclusive but preserve input text
  useEffect(() => {
    if (leftResults.length > 0) {
      setLeftOpen(true);
      setRightOpen(false);
    } else {
      setLeftOpen(false);
    }
  }, [leftResults]);

  useEffect(() => {
    if (results.length > 0) {
      setRightOpen(true);
      setLeftOpen(false);
    } else {
      setRightOpen(false);
    }
  }, [results]);

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
                onChange={handleLeftSearch}
                onFocus={() => { setLeftOpen(true); setRightOpen(false); }}
                placeholder={leftSelected ? "Change left selection..." : `Search left ${type === "course" ? "course" : "instructor"}...`}
                className="w-full px-4 pr-10 py-2 rounded-2xl border border-gray-300 focus:border-blue-500 focus:outline-none text-gray-900 placeholder:text-gray-500 dark:text-green-100"
              />
              <button type="button" onClick={() => { clearLeft(); setLeftOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-green-100 dark:hover:bg-gray-700" aria-label="Clear left input">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {leftOpen && leftResults.length > 0 && (
              <ul className="absolute left-0 right-0 z-50 top-full mt-2 bg-[#EFEAE6] dark:bg-jungle-canopy/90 border border-gray-200 rounded shadow max-h-60 overflow-y-auto text-gray-900 dark:text-green-100 custom-scrollbar">
                {leftResults.map((item: any) => (
                  <li key={item.id} className="px-3 py-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-green-800" onMouseDown={(e) => { e.preventDefault(); setLeftSelected(item); setLeftSearch(""); setLeftResults([]); setLeftOpen(false); }}>
                    {type === "course" ? `${item.prefix} ${item.number} — ${item.title}` : `${item.lastName}, ${item.firstName}`}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {leftData && leftData.chartData ? (
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
                onChange={handleSearch}
                onFocus={() => { setRightOpen(true); setLeftOpen(false); }}
                placeholder={`Search for another ${type === "course" ? "course" : "instructor"}...`}
                className="w-full px-4 pr-10 py-2 rounded-2xl border border-gray-300 focus:border-blue-500 focus:outline-none text-gray-900 placeholder:text-gray-500 dark:text-green-100"
              />
              <button type="button" onClick={() => { clearRight(); setRightOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-green-100 dark:hover:bg-gray-700" aria-label="Clear right input">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {rightOpen && results.length > 0 && (
              <ul className="absolute left-0 right-0 z-50 top-full mt-2 bg-[#EFEAE6] dark:bg-jungle-canopy/90 border border-gray-200 rounded shadow max-h-60 overflow-y-auto text-gray-900 dark:text-green-100 w-full custom-scrollbar">
                {results.map((item: any) => (
                  <li key={item.id} className="px-3 py-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-green-800" onMouseDown={(e) => { e.preventDefault(); setSelected(item); setSearch(""); setResults([]); setRightOpen(false); }}>
                    {type === "course" ? `${item.prefix} ${item.number} — ${item.title}` : `${item.lastName}, ${item.firstName}`}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center w-full">
            {selected && rightData && rightData.chartData ? (
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
