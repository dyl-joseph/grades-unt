import { NO_STORE_HEADERS } from "./no-store";

export class RequestBodyError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

// Bound the actual streamed bytes, not only an optional/spoofable Content-Length.
// Used before adapters that would otherwise eagerly clone and parse the body.
export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new RequestBodyError("Request body is too large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError("Invalid JSON body", 400);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const read = async () => {
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) throw new RequestBodyError("Request body is too large", 413);
        chunks.push(value);
      }
      const joined = new Uint8Array(bytes);
      let offset = 0;
      for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
      try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(joined)); }
      catch { throw new RequestBodyError("Invalid JSON body", 400); }
    };
    return await Promise.race([
      read(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new RequestBodyError("Request body timed out", 408)), 5_000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    void reader.cancel().catch(() => undefined);
  }
}

export function requestBodyErrorResponse(error: unknown) {
  const status = error instanceof RequestBodyError ? error.status : 400;
  const message = error instanceof RequestBodyError ? error.message : "Invalid request body";
  return Response.json({ error: message }, { status, headers: NO_STORE_HEADERS });
}
