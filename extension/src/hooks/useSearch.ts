import { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "./useDebounce";
import type { SearchResult, ExtensionResponse } from "../lib/types";

const MIN_QUERY_LENGTH = 2;

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 250);
  const cache = useRef(new Map<string, SearchResult>());

  const search = useCallback(async (q: string): Promise<SearchResult | null> => {
    const normalized = q.trim().toLowerCase();
    if (normalized.length < MIN_QUERY_LENGTH) return null;

    const cached = cache.current.get(normalized);
    if (cached) return cached;

    const response: ExtensionResponse = await chrome.runtime.sendMessage({
      type: "SEARCH",
      payload: { q: normalized },
    });

    if (!response.ok) throw new Error(response.error ?? "Search failed");

    const data = response.data as SearchResult;
    cache.current.set(normalized, data);
    if (cache.current.size > 25) {
      const oldest = cache.current.keys().next().value;
      if (oldest !== undefined) cache.current.delete(oldest);
    }
    return data;
  }, []);

  useEffect(() => {
    const normalized = debouncedQuery.trim().toLowerCase();
    if (normalized.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    search(debouncedQuery)
      .then((data) => {
        if (data) {
          setResults(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Search failed");
        setLoading(false);
      });
  }, [debouncedQuery, search]);

  return { query, setQuery, results, loading, error };
}
