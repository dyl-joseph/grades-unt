import type { ExtensionMessage, ExtensionResponse } from "./lib/types";
import { ensureInstallId } from "./lib/storage";

async function getHeaders(): Promise<Record<string, string>> {
  const installId = await ensureInstallId();
  return {
    "X-Extension-ID": chrome.runtime.id,
    "X-Install-ID": installId,
  };
}

async function getBaseUrl(): Promise<string> {
  const { apiBaseUrl } = await chrome.storage.local.get("apiBaseUrl");
  return (apiBaseUrl ?? "https://www.untgrades.app") as string;
}

async function apiFetch(path: string): Promise<ExtensionResponse> {
  try {
    const baseUrl = await getBaseUrl();
    const headers = await getHeaders();
    const res = await fetch(`${baseUrl}${path}`, { headers });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, status: res.status };
    }
    return { ok: true, data: await res.json() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureInstallId();
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender: unknown, sendResponse: (r: ExtensionResponse) => void) => {
    if (message.type === "SEARCH") {
      const q = (message.payload.q ?? "").trim();
      apiFetch(`/api/search?q=${encodeURIComponent(q)}`).then(sendResponse);
    } else if (message.type === "COURSE_DETAIL") {
      const { prefix, number } = message.payload;
      apiFetch(`/api/course/${encodeURIComponent(prefix ?? "")}/${encodeURIComponent(number ?? "")}`).then(sendResponse);
    } else if (message.type === "INSTRUCTOR_DETAIL") {
      const { id } = message.payload;
      apiFetch(`/api/instructor/${encodeURIComponent(id ?? "")}`).then(sendResponse);
    } else {
      sendResponse({ ok: false, error: "Unknown message type" });
      return false;
    }
    return true;
  }
);
