import { initializeMetrics, recordRequestError } from "@/lib/metrics";

export async function register() {
  initializeMetrics();
}

export function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[]> },
  errorContext: { routePath: string; routeType: string }
) {
  recordRequestError(request.path, request.method, errorContext.routePath, errorContext.routeType, error);
}
