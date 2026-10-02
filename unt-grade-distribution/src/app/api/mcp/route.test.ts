import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "./route";

async function call(method: string, id: number, params: object) {
  const response = await POST(new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-11-25",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  }));
  assert.equal(response.status, 200);
  const body = await response.text();
  const data = body.split("\n").find((line) => line.startsWith("data: "));
  assert.ok(data);
  return JSON.parse(data.slice(6));
}

test("MCP endpoint initializes and exposes read-only grade tools", async () => {
  const initialized = await call("initialize", 1, {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "test", version: "1.0" },
  });
  assert.equal(initialized.result.serverInfo.name, "unt-grades");

  const listed = await call("tools/list", 2, {});
  assert.deepEqual(listed.result.tools.map((tool: { name: string }) => tool.name), [
    "search_grades",
    "get_course_grades",
    "get_instructor_courses",
  ]);
  assert.ok(listed.result.tools.every((tool: { annotations: { readOnlyHint?: boolean } }) =>
    tool.annotations.readOnlyHint === true
  ));
});

test("MCP rejects batch amplification before executing any grade tools", async (t) => {
  const { gradeData } = await import("@/lib/mcp-data");
  const search = t.mock.method(gradeData, "search", async () => ({ courses: [], instructors: [] }));
  const message = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_grades", arguments: { query: "CSCE" } } };
  const response = await POST(new Request("http://localhost/api/mcp", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify([message, message]),
  }));
  assert.equal(response.status, 400);
  assert.match(await response.text(), /batch requests are not supported/);
  assert.equal(search.mock.callCount(), 0);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
});

test("MCP bounds actual request body bytes before tool work", async (t) => {
  const { gradeData } = await import("@/lib/mcp-data");
  const search = t.mock.method(gradeData, "search", async () => ({ courses: [], instructors: [] }));
  const response = await POST(new Request("http://localhost/api/mcp", {
    method: "POST", body: JSON.stringify({ padding: "x".repeat(32 * 1024) }),
  }));
  assert.equal(response.status, 413);
  assert.equal(search.mock.callCount(), 0);
});

test("MCP rejects malformed JSON and still supports an ordinary tool call", async (t) => {
  const malformed = await POST(new Request("http://localhost/api/mcp", { method: "POST", body: "{" }));
  assert.equal(malformed.status, 400);
  const { gradeData } = await import("@/lib/mcp-data");
  const search = t.mock.method(gradeData, "search", async () => ({ courses: [], instructors: [] }));
  const reply = await call("tools/call", 3, { name: "search_grades", arguments: { query: "CSCE" } });
  assert.deepEqual(reply.result.structuredContent, { courses: [], instructors: [] });
  assert.equal(search.mock.callCount(), 1);
});
