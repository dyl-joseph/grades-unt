import type { ExtensionMessage, ExtensionResponse } from "./types";

async function getHeaders(): Promise<Record<string, string>> {
  const { installId } = await chrome.storage.local.get("installId");
  return {
    "X-Extension-ID": chrome.runtime.id,
    "X-Install-ID": installId ?? "",
  };
}

async function getBaseUrl(): Promise<string> {
  const { apiBaseUrl } = await chrome.storage.local.get("apiBaseUrl");
  return apiBaseUrl ?? "https://www.untgrades.app";
}

export async function sendMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  return chrome.runtime.sendMessage(message);
}

export { getHeaders, getBaseUrl };
