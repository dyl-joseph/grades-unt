"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from "react";
import type { CartItem } from "@/lib/types";

/* ── State shape ─────────────────────────────────────── */
interface SavedCoursesState {
  items: CartItem[];
  /** False until localStorage has been read; nothing is persisted before then. */
  hydrated: boolean;
}

/* ── Actions ─────────────────────────────────────────── */
type SavedCoursesAction =
  | { type: "ADD"; item: CartItem }
  | { type: "REMOVE"; courseId: number }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; items: CartItem[] };

/* ── Reducer ─────────────────────────────────────────── */
function savedCoursesReducer(
  state: SavedCoursesState,
  action: SavedCoursesAction
): SavedCoursesState {
  switch (action.type) {
    case "ADD":
      if (state.items.some((i) => i.courseId === action.item.courseId))
        return state;
      return { ...state, items: [...state.items, action.item] };
    case "REMOVE":
      return {
        ...state,
        items: state.items.filter((i) => i.courseId !== action.courseId),
      };
    case "CLEAR":
      return { ...state, items: [] };
    case "HYDRATE":
      return { items: action.items, hydrated: true };
    default:
      return state;
  }
}

/* ── Context value ───────────────────────────────────── */
interface SavedCoursesContextValue {
  items: CartItem[];
  addCourse: (item: CartItem) => void;
  removeCourse: (courseId: number) => void;
  clearCart: () => void;
  isSaved: (courseId: number) => boolean;
}

const SavedCoursesContext = createContext<SavedCoursesContextValue | null>(null);

const STORAGE_KEY = "unt-grades-saved-courses";

const NUMERIC_FIELDS = [
  "courseId", "gradeA", "gradeB", "gradeC", "gradeD", "gradeF",
  "gradeP", "gradeNP", "gradeW", "gradeI", "totalEnroll", "sectionCount",
] as const;

/** Drop entries that don't match the current CartItem shape (old versions, manual edits). */
export function parseStoredItems(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CartItem => {
      if (!item || typeof item !== "object") return false;
      const record = item as Record<string, unknown>;
      return (
        typeof record.prefix === "string" &&
        typeof record.number === "string" &&
        typeof record.title === "string" &&
        (record.gpa === null || (typeof record.gpa === "number" && Number.isFinite(record.gpa))) &&
        NUMERIC_FIELDS.every((field) => typeof record[field] === "number" && Number.isFinite(record[field]))
      );
    });
  } catch {
    return [];
  }
}

/* ── Provider ────────────────────────────────────────── */
export function SavedCoursesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(savedCoursesReducer, { items: [], hydrated: false });

  // Hydrate from localStorage on mount
  useEffect(() => {
    let items: CartItem[] = [];
    try {
      items = parseStoredItems(localStorage.getItem(STORAGE_KEY));
    } catch {
      // Storage unavailable (privacy mode, blocked cookies) — start empty
    }
    dispatch({ type: "HYDRATE", items });
  }, []);

  // Persist to localStorage on every change. Skip the pre-hydration empty
  // state: writing it would wipe saved courses (and under StrictMode's double
  // effects the re-run hydrate would then read back []).
  useEffect(() => {
    if (!state.hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // Quota exceeded or storage unavailable — keep in-memory state
    }
  }, [state.hydrated, state.items]);

  const addCourse = (item: CartItem) => dispatch({ type: "ADD", item });
  const removeCourse = (courseId: number) =>
    dispatch({ type: "REMOVE", courseId });
  const clearCart = () => dispatch({ type: "CLEAR" });
  const isSaved = (courseId: number) =>
    state.items.some((i) => i.courseId === courseId);

  return (
    <SavedCoursesContext.Provider
      value={{ items: state.items, addCourse, removeCourse, clearCart, isSaved }}
    >
      {children}
    </SavedCoursesContext.Provider>
  );
}

/* ── Hook ────────────────────────────────────────────── */
export function useSavedCourses(): SavedCoursesContextValue {
  const ctx = useContext(SavedCoursesContext);
  if (!ctx) {
    throw new Error(
      "useSavedCourses must be used within SavedCoursesProvider"
    );
  }
  return ctx;
}
