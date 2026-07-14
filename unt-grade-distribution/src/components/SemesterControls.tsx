"use client";

import { useEffect, useRef, useState } from "react";

export type SemesterCount = 1 | 2;

type SemesterSelectProps = {
  id: string;
  labels: string[];
  value: string;
  onChange: (value: string) => void;
};

type ThemedDropdownProps = {
  id: string;
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
};

function ThemedDropdown({ id, label, value, options, onChange }: ThemedDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="flex min-w-0 flex-col gap-1 text-xs font-medium text-gray-600 dark:text-green-200/70">
      <label htmlFor={id}>{label}</label>
      <div className="relative w-full min-w-0 sm:w-auto">
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          className="flex h-10 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-jungle-tan-dark/20 bg-white/70 px-3 py-2 text-left text-sm text-gray-900 shadow-sm outline-none transition-colors hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-green-900/60 dark:bg-green-950/20 dark:text-green-100 dark:hover:border-green-500/50 dark:focus:border-green-500 sm:w-auto"
        >
          <span className="truncate">{selectedOption?.label ?? value}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className={`pointer-events-none h-4 w-4 shrink-0 text-gray-500 transition-transform dark:text-green-300/70 ${isOpen ? "rotate-180" : ""}`}
          >
            <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {isOpen ? (
          <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-44 overflow-hidden rounded-xl border border-jungle-tan-dark/20 bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur dark:border-green-900/60 dark:bg-green-950/95 dark:ring-white/10 sm:w-max sm:min-w-full">
            <div role="listbox" aria-labelledby={id} className="p-1">
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "bg-primary text-white dark:bg-green-700 dark:text-white"
                        : "text-gray-700 hover:bg-jungle-tan-dark/10 dark:text-green-100 dark:hover:bg-green-900/50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SemesterSelect({ id, labels, value, onChange }: SemesterSelectProps) {
  return (
    <ThemedDropdown
      id={id}
      label="Semester"
      value={value}
      options={[{ label: "All semesters", value: "all" }, ...labels.map((label) => ({ label, value: label }))]}
      onChange={onChange}
    />
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
    <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-end sm:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
        <ThemedDropdown
          id={id}
          label="Starting semester"
          value={anchor}
          options={labels.map((label) => ({ label, value: label }))}
          onChange={onAnchorChange}
        />
      </div>
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

type SemesterRangeBarProps = {
  labels: string[];
  startBoundary: number;
  endBoundary: number;
  onStartBoundaryChange: (value: number) => void;
  onEndBoundaryChange: (value: number) => void;
};

export function SemesterRangeBar({
  labels,
  startBoundary,
  endBoundary,
  onStartBoundaryChange,
  onEndBoundaryChange,
}: SemesterRangeBarProps) {
  if (labels.length < 1) return null;

  const maxBoundary = labels.length;
  const rangeRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    startBoundary: number;
    endBoundary: number;
    clientX: number;
  } | null>(null);
  const [dragHandle, setDragHandle] = useState<"start" | "end" | "range" | null>(null);

  const safeStartBoundary = Math.max(0, Math.min(startBoundary, Math.max(0, maxBoundary - 1)));
  const safeEndBoundary = Math.max(
    safeStartBoundary + 1,
    Math.min(endBoundary, Math.min(maxBoundary, safeStartBoundary + 2))
  );
  const selectedLabels = labels.slice(safeStartBoundary, safeEndBoundary);
  const leftPercent = maxBoundary === 0 ? 0 : (safeStartBoundary / maxBoundary) * 100;
  const rightPercent = maxBoundary === 0 ? 100 : (safeEndBoundary / maxBoundary) * 100;

  useEffect(() => {
    if (!dragHandle) return;

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const getBoundaryFromClientX = (clientX: number) => {
      const rect = rangeRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return 0;

      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      return Math.round(ratio * maxBoundary);
    };

    const handleMove = (event: PointerEvent) => {
      const nextBoundary = getBoundaryFromClientX(event.clientX);

      if (dragHandle === "range") {
        const dragState = dragStartRef.current;
        if (!dragState) return;

        const width = Math.max(1, dragState.endBoundary - dragState.startBoundary);
        const trackWidth = rangeRef.current?.getBoundingClientRect().width || 1;
        const deltaBoundary = Math.round(((event.clientX - dragState.clientX) / trackWidth) * maxBoundary);
        const nextStart = clamp(dragState.startBoundary + deltaBoundary, 0, Math.max(0, maxBoundary - width));
        onStartBoundaryChange(nextStart);
        onEndBoundaryChange(nextStart + width);
        return;
      }

      if (dragHandle === "start") {
        const nextStart = clamp(nextBoundary, 0, Math.max(0, safeEndBoundary - 1));
        const boundedStart = clamp(nextStart, Math.max(0, safeEndBoundary - 2), safeEndBoundary - 1);
        onStartBoundaryChange(boundedStart);
      } else if (dragHandle === "end") {
        const nextEnd = clamp(nextBoundary, safeStartBoundary + 1, Math.min(maxBoundary, safeStartBoundary + 2));
        onEndBoundaryChange(nextEnd);
      }
    };

    const stopDragging = () => setDragHandle(null);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [dragHandle, maxBoundary, onEndBoundaryChange, onStartBoundaryChange, safeEndBoundary, safeStartBoundary]);

  return (
    <div className="w-full min-w-0 px-3 py-2">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-green-300/50">
        <span>Older</span>
        <span>Newer</span>
      </div>

      <div ref={rangeRef} className="relative h-20 w-full select-none cursor-pointer">
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-jungle-tan-dark/30 dark:bg-green-900/60" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary transition-[left,width] duration-150 ease-out dark:bg-green-500"
          style={{ left: `${leftPercent}%`, width: `${Math.max(rightPercent - leftPercent, 0)}%` }}
        />

        <div
          aria-label="Drag selected semester window"
          className="absolute top-1/2 z-20 h-8 -translate-y-1/2 rounded-full cursor-grab active:cursor-grabbing"
          style={{ left: `${leftPercent}%`, width: `${Math.max(rightPercent - leftPercent, 0)}%` }}
          onPointerDown={(event) => {
            event.preventDefault();
            dragStartRef.current = {
              startBoundary: safeStartBoundary,
              endBoundary: safeEndBoundary,
              clientX: event.clientX,
            };
            setDragHandle("range");
          }}
        />

        {Array.from({ length: labels.length + 1 }).map((_, boundaryIndex) => {
          const boundaryPercent = maxBoundary === 0 ? 0 : (boundaryIndex / maxBoundary) * 100;
          const isStartBoundary = boundaryIndex === safeStartBoundary;
          const isEndBoundary = boundaryIndex === safeEndBoundary;
          const isInside = boundaryIndex > safeStartBoundary && boundaryIndex < safeEndBoundary;

          return (
            <div
              key={`boundary-${boundaryIndex}`}
              className="absolute top-1/2 flex -translate-y-1/2 flex-col items-center"
              style={{ left: `${boundaryPercent}%` }}
            >
              <span
                className={`h-2 w-px ${isInside || isStartBoundary || isEndBoundary ? "bg-primary dark:bg-green-500" : "bg-jungle-tan-dark/45 dark:bg-green-800/70"}`}
              />
            </div>
          );
        })}

        <div
          role="slider"
          aria-label="Left semester bound"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, safeEndBoundary - 1)}
          aria-valuenow={safeStartBoundary}
          tabIndex={0}
          onPointerDown={(event) => {
            event.preventDefault();
            dragStartRef.current = null;
            setDragHandle("start");
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              onStartBoundaryChange(Math.max(0, safeStartBoundary - 1));
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              onStartBoundaryChange(Math.min(safeEndBoundary - 1, safeStartBoundary + 1));
            }
          }}
          className="absolute top-1/2 z-30 flex h-5 w-5 -translate-y-1/2 -translate-x-1/2 items-center justify-center rounded-full border-2 border-primary bg-white shadow-md outline-none transition-[left,transform,box-shadow] duration-150 ease-out cursor-grab focus:ring-2 focus:ring-primary/30 active:cursor-grabbing active:scale-105 dark:border-green-300 dark:bg-green-950"
          style={{ left: `${leftPercent}%` }}
        >
          <span className="h-2 w-2 rounded-full bg-primary dark:bg-green-300" />
        </div>
        <div
          role="slider"
          aria-label="Right semester bound"
          aria-valuemin={Math.min(labels.length, safeStartBoundary + 1)}
          aria-valuemax={labels.length}
          aria-valuenow={safeEndBoundary}
          tabIndex={0}
          onPointerDown={(event) => {
            event.preventDefault();
            dragStartRef.current = null;
            setDragHandle("end");
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              onEndBoundaryChange(Math.max(safeStartBoundary + 1, safeEndBoundary - 1));
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              onEndBoundaryChange(Math.min(labels.length, safeEndBoundary + 1));
            }
          }}
          className="absolute top-1/2 z-30 flex h-5 w-5 -translate-y-1/2 -translate-x-1/2 items-center justify-center rounded-full border-2 border-primary bg-white shadow-md outline-none transition-[left,transform,box-shadow] duration-150 ease-out cursor-grab focus:ring-2 focus:ring-primary/30 active:cursor-grabbing active:scale-105 dark:border-green-300 dark:bg-green-950"
          style={{ left: `${rightPercent}%` }}
        >
          <span className="h-2 w-2 rounded-full bg-primary dark:bg-green-300" />
        </div>

        {selectedLabels.map((label, index) => {
          const centerBoundary = safeStartBoundary + index + 0.5;
          return (
            <div
              key={`${label}-${index}`}
              className="absolute top-[58%] flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${(centerBoundary / maxBoundary) * 100}%` }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600 dark:text-green-100">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
