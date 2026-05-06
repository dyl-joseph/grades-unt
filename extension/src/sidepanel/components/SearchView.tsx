import { useState, useRef, useCallback, useEffect } from "react";
import { useSearch } from "../../hooks/useSearch";
import { addSearchHistory, getSearchHistory, clearSearchHistory } from "../../lib/storage";
import type { HistoryEntry } from "../../lib/storage";
import type { CourseResult, InstructorResult } from "../../lib/types";

interface SearchViewProps {
  onCourseSelect: (prefix: string, number: string) => void;
  onInstructorSelect: (id: number) => void;
}

export default function SearchView({ onCourseSelect, onInstructorSelect }: SearchViewProps) {
  const { query, setQuery, results, loading, error } = useSearch();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSearchHistory().then(setHistory);
  }, []);

  const allItems = useCallback(() => {
    if (!results) return [];
    const items: Array<{ type: "course" | "instructor"; id: string; label: string }> = [];
    results.courses.forEach((c: CourseResult) =>
      items.push({ type: "course", id: `${c.prefix}/${c.number}`, label: `${c.prefix} ${c.number} — ${c.title}` })
    );
    results.instructors.forEach((i: InstructorResult) =>
      items.push({ type: "instructor", id: String(i.id), label: `${i.lastName}, ${i.firstName}` })
    );
    return items;
  }, [results]);

  const navigate = (type: "course" | "instructor", id: string) => {
    addSearchHistory(query.trim());
    setQuery("");
    if (type === "course") {
      const [prefix, number] = id.split("/");
      onCourseSelect(prefix, number);
    } else {
      onInstructorSelect(Number(id));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = allItems();
    if (items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = highlightIdx >= 0 ? highlightIdx : 0;
      const item = items[idx];
      if (item) navigate(item.type, item.id);
    } else if (e.key === "Escape") {
      setQuery("");
    }
  };

  const hasQuery = query.trim().length >= 2;
  const items = allItems();

  return (
    <div ref={containerRef}>
      <div style={{ marginBottom: "8px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px 0", color: "#1B5E20" }}>
          UNT Grade Explorer
        </h1>
        <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
          Search course or professor
        </p>
      </div>

      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setHighlightIdx(-1); }}
          onKeyDown={handleKeyDown}
          placeholder="e.g. ACCT 2010 or Moore"
          autoFocus
          aria-busy={loading}
          style={{
            width: "100%",
            padding: "10px 36px 10px 12px",
            fontSize: "14px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {loading && hasQuery && (
          <div style={{
            position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
            width: "16px", height: "16px", border: "2px solid #ccc",
            borderTopColor: "#1B5E20", borderRadius: "50%", animation: "spin 0.6s linear infinite",
          }}
          />
        )}
      </div>

      <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg) } }`}</style>

      {hasQuery && items.length > 0 && (
        <div style={{ marginTop: "4px", borderRadius: "8px", border: "1px solid #e0e0e0", overflow: "hidden" }}>
          {results!.courses.length > 0 && (
            <div>
              <div style={{ padding: "6px 12px", fontSize: "11px", fontWeight: 600, color: "#558B2F", textTransform: "uppercase", letterSpacing: "0.05em", background: "#f5f5f5" }}>
                Courses
              </div>
              {results!.courses.map((c: CourseResult, i: number) => (
                <button
                  key={`c-${c.id}`}
                  onClick={() => navigate("course", `${c.prefix}/${c.number}`)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                    fontSize: "13px", border: "none", cursor: "pointer",
                    background: highlightIdx === i ? "#e8f5e9" : "white",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <strong>{c.prefix} {c.number}</strong>
                  <span style={{ color: "#777", marginLeft: "6px" }}>— {c.title}</span>
                </button>
              ))}
            </div>
          )}
          {results!.instructors.length > 0 && (
            <div>
              <div style={{ padding: "6px 12px", fontSize: "11px", fontWeight: 600, color: "#558B2F", textTransform: "uppercase", letterSpacing: "0.05em", background: "#f5f5f5" }}>
                Instructors
              </div>
              {results!.instructors.map((inst: InstructorResult, i: number) => {
                const idx = results!.courses.length + i;
                return (
                  <button
                    key={`i-${inst.id}`}
                    onClick={() => navigate("instructor", String(inst.id))}
                    style={{
                      display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                      fontSize: "13px", border: "none", cursor: "pointer",
                      background: highlightIdx === idx ? "#e8f5e9" : "white",
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    <strong>{inst.lastName}, {inst.firstName}</strong>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {hasQuery && !loading && !error && items.length === 0 && (
        <div style={{ marginTop: "8px", padding: "16px", textAlign: "center", fontSize: "13px", color: "#999" }}>
          No results for "{query.trim()}"
        </div>
      )}

      {hasQuery && !loading && error && (
        <div style={{ marginTop: "8px", padding: "16px", textAlign: "center", fontSize: "13px", color: "#c62828" }}>
          Search failed. Try again.
        </div>
      )}

      {!hasQuery && history.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Recent
            </span>
            <button
              onClick={async () => { await clearSearchHistory(); setHistory([]); }}
              style={{ fontSize: "11px", color: "#999", border: "none", background: "none", cursor: "pointer" }}
            >
              Clear
            </button>
          </div>
          {history.slice(0, 10).map((h: HistoryEntry) => (
            <button
              key={h.timestamp}
              onClick={() => setQuery(h.query)}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "6px 12px",
                fontSize: "13px", border: "none", cursor: "pointer",
                background: "white", borderRadius: "4px", marginBottom: "2px",
                color: "#333",
              }}
            >
              {h.query}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
