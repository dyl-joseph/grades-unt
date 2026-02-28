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

/* ── Provider ────────────────────────────────────────── */
export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) {
          dispatch({ type: "HYDRATE", items: parsed });
        }
      }
    } catch {
      // Corrupt data — ignore
    }
  }, []);

  // Persist to localStorage on every change (skip initial empty state)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items]);

  const addCourse = (item: CartItem) => dispatch({ type: "ADD", item });
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
