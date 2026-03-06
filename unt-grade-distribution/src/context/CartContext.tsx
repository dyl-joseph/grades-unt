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
interface CartState {
  items: CartItem[];
}

/* ── Actions ─────────────────────────────────────────── */
type CartAction =
  | { type: "ADD"; item: CartItem }
  | { type: "REMOVE"; courseId: number }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; items: CartItem[] };

/* ── Reducer ─────────────────────────────────────────── */
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD":
      if (state.items.some((i) => i.courseId === action.item.courseId))
        return state;
      return { items: [...state.items, action.item] };
    case "REMOVE":
      return {
        items: state.items.filter((i) => i.courseId !== action.courseId),
      };
    case "CLEAR":
      return { items: [] };
    case "HYDRATE":
      return { items: action.items };
    default:
      return state;
  }
}

/* ── Context value ───────────────────────────────────── */
interface CartContextValue {
  items: CartItem[];
  addCourse: (item: CartItem) => void;
  removeCourse: (courseId: number) => void;
  clearCart: () => void;
  isInCart: (courseId: number) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "unt-grades-cart";
const MAX_CART_ITEMS = 25;

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isValidGpa(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 4);
}

function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;

  return (
    isNonNegativeInteger(item.courseId) &&
    typeof item.prefix === "string" &&
    item.prefix.trim().length > 0 &&
    item.prefix.length <= 10 &&
    typeof item.number === "string" &&
    item.number.trim().length > 0 &&
    item.number.length <= 16 &&
    typeof item.title === "string" &&
    item.title.trim().length > 0 &&
    item.title.length <= 200 &&
    isValidGpa(item.gpa) &&
    isNonNegativeInteger(item.gradeA) &&
    isNonNegativeInteger(item.gradeB) &&
    isNonNegativeInteger(item.gradeC) &&
    isNonNegativeInteger(item.gradeD) &&
    isNonNegativeInteger(item.gradeF) &&
    isNonNegativeInteger(item.gradeP) &&
    isNonNegativeInteger(item.gradeNP) &&
    isNonNegativeInteger(item.gradeW) &&
    isNonNegativeInteger(item.gradeI) &&
    isNonNegativeInteger(item.totalEnroll) &&
    isNonNegativeInteger(item.sectionCount)
  );
}

function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<number>();

  return value
    .filter(isValidCartItem)
    .filter((item) => {
      if (seen.has(item.courseId)) return false;
      seen.add(item.courseId);
      return true;
    })
    .slice(0, MAX_CART_ITEMS);
}

/* ── Provider ────────────────────────────────────────── */
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const sanitizedItems = sanitizeCartItems(parsed);
        if (sanitizedItems.length > 0) {
          dispatch({ type: "HYDRATE", items: sanitizedItems });
        }
      }
    } catch {
      // Corrupt data — ignore
    }
  }, []);

  // Persist to localStorage on every change (skip initial empty state)
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(sanitizeCartItems(state.items))
    );
  }, [state.items]);

  const addCourse = (item: CartItem) => {
    if (!isValidCartItem(item)) return;
    dispatch({ type: "ADD", item });
  };
  const removeCourse = (courseId: number) =>
    dispatch({ type: "REMOVE", courseId });
  const clearCart = () => dispatch({ type: "CLEAR" });
  const isInCart = (courseId: number) =>
    state.items.some((i) => i.courseId === courseId);

  return (
    <CartContext.Provider
      value={{ items: state.items, addCourse, removeCourse, clearCart, isInCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

/* ── Hook ────────────────────────────────────────────── */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
