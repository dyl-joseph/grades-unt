
"use client";
import { useState, useEffect } from "react";
import { aggregateGrades, toChartData } from "@/lib/grades";
// TODO: Import GpaBadge
import GradeChart from "@/components/GradeChart";

export default function ComparePage({ searchParams }: { searchParams: any }) {
  // Supported: type=course|instructor, a
  const { type, a } = searchParams;
  const invalidParams = !type || !a || (type !== "course" && type !== "instructor");

  // State for right-side search and selection
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]); // TODO: type
  const [selected, setSelected] = useState<any | null>(null);
  const [leftData, setLeftData] = useState<any | null>(null);
  const [rightData, setRightData] = useState<any | null>(null);

  // Fetch and aggregate data for left entity
  useEffect(() => {
    async function fetchLeft() {
      if (!a) return;
      let url = "";
      let sections = [];
      if (type === "course") {
        // Parse prefix:number
        const [prefix, number] = a.split(":");
        url = `/api/course/${prefix}/${number}`;
      } else {
        url = `/api/instructor/${a}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (type === "course" && data.sections) {
        sections = data.sections;
      } else if (type === "instructor" && data.sections) {
        sections = data.sections;
      }
      // Aggregate grades client-side
      const aggregate = aggregateGrades(sections);
      const chartData = toChartData(aggregate);
      setLeftData({ chartData });
    }
    fetchLeft();
  }, [a, type]);

  // Fetch and aggregate data for right entity
  useEffect(() => {
    async function fetchRight() {
      if (!selected) {
        setRightData(null);
        return;
      }
      let url = "";
      let sections = [];
      if (type === "course") {
        url = `/api/course/${selected.prefix}/${selected.number}`;
      } else {
        url = `/api/instructor/${selected.id}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (type === "course" && data.sections) {
        sections = data.sections;
      } else if (type === "instructor" && data.sections) {
        sections = data.sections;
      }
      // Aggregate grades client-side
      const aggregate = aggregateGrades(sections);
      const chartData = toChartData(aggregate);
      setRightData({ chartData });
    }
    fetchRight();
  }, [selected, type]);

  // Handler for search input
  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (value.length < 2) {
      setResults([]);
      return;
    }
    // Fetch aggregate entities only
    const res = await fetch(`/api/search?query=${encodeURIComponent(value)}`);
    const data = await res.json();
    // Filter for aggregate-level only
    if (type === "course") {
      setResults(data.courses || []);
    } else {
      setResults(data.instructors || []);
    }
  };

  // Handler for selecting an aggregate entity
  const handleSelect = (item: any) => {
    setSelected(item);
    setResults([]);
    setSearch("");
  };

  if (invalidParams) {
    return (
      <main className="flex flex-col items-center p-4">
        <h1 className="text-2xl font-bold mb-4">Compare</h1>
        <div className="text-red-600">Invalid compare parameters</div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-4">Compare {type === "course" ? "Courses" : "Instructors"}</h1>
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl">
        {/* Left: Aggregate graph for selected entity */}
        <div className="flex-1 border rounded-xl bg-white dark:bg-jungle-canopy/60 p-6 shadow-sm min-h-[400px] mb-8 md:mb-0">
          {leftData && leftData.chartData ? (
            <GradeChart data={leftData.chartData} height={320} mode="percentage" />
          ) : (
            <div className="text-center text-gray-500">Loading aggregate graph...</div>
          )}
        </div>
        {/* Right: Search and aggregate graph or empty state */}
        <div className="flex-1 flex flex-col items-center border-2 border-dashed border-gray-400 rounded-xl bg-gray-50 dark:bg-jungle-tan-light/30 p-6 min-h-[400px]">
          <div className="w-full mb-4">
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder={`Search for another ${type === "course" ? "course" : "instructor"}...`}
              className="w-full px-3 py-2 rounded border border-gray-300 focus:border-blue-500 focus:outline-none"
            />
            {results.length > 0 && (
              <ul className="mt-2 bg-white border rounded shadow max-h-60 overflow-y-auto">
                {results.map((item: any) => (
                  <li
                    key={type === "course" ? item.id : item.id}
                    className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                    onClick={() => handleSelect(item)}
                  >
                    {type === "course"
                      ? `${item.prefix} ${item.number} — ${item.title}`
                      : `${item.lastName}, ${item.firstName}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center w-full">
            {selected && rightData && rightData.chartData ? (
              <div className="w-full">
                <GradeChart data={rightData.chartData} height={320} mode="percentage" />
              </div>
            ) : (
              <span className="text-gray-400 text-lg">No selection yet</span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
