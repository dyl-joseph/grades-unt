const MAX_HISTORY = 20;

export interface HistoryEntry {
  query: string;
  timestamp: number;
}

export async function getSearchHistory(): Promise<HistoryEntry[]> {
  const { searchHistory } = await chrome.storage.local.get("searchHistory");
  return (searchHistory ?? []) as HistoryEntry[];
}

export async function addSearchHistory(query: string): Promise<void> {
  const history = await getSearchHistory();
  const filtered = history.filter((h) => h.query !== query);
  filtered.unshift({ query, timestamp: Date.now() });
  if (filtered.length > MAX_HISTORY) filtered.length = MAX_HISTORY;
  await chrome.storage.local.set({ searchHistory: filtered });
}

export async function clearSearchHistory(): Promise<void> {
  await chrome.storage.local.set({ searchHistory: [] });
}

export async function ensureInstallId(): Promise<string> {
  const { installId } = await chrome.storage.local.get("installId");
  if (installId) return installId as string;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ installId: id });
  return id;
}
