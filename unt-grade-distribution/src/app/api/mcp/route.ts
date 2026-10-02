import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { gradeData } from "@/lib/mcp-data";
import { readBoundedJson, RequestBodyError, requestBodyErrorResponse } from "@/lib/request-body";

export const runtime = "nodejs";

function result(value: object) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

function notFound() {
  return { content: [{ type: "text" as const, text: "Course not found" }], isError: true };
}

const paging = {
  offset: z.number().int().nonnegative().default(0),
  limit: z.number().int().min(1).max(50).default(25),
};

const handler = createMcpHandler((server) => {
  server.registerTool("search_grades", {
    title: "Search UNT courses and instructors",
    description: "Search the deployed UNT grade data by course code, course title, or instructor name. Returns up to eight courses and eight instructors.",
    inputSchema: z.object({ query: z.string().trim().min(2).max(100) }),
    annotations: { readOnlyHint: true },
  }, async ({ query }) => result(await gradeData.search(query)));

  server.registerTool("get_course_grades", {
    title: "Get UNT course grade distributions",
    description: "Get grade counts for a course's sections and aggregate GPA. GPA uses A through F only. Sections are paginated; use nextOffset to continue.",
    inputSchema: z.object({
      prefix: z.string().trim().min(1).max(12),
      number: z.string().trim().min(1).max(12),
      ...paging,
    }),
    annotations: { readOnlyHint: true },
  }, async ({ prefix, number, offset, limit }) => {
    const course = await gradeData.getCourse(prefix, number, offset, limit);
    return course ? result(course) : notFound();
  });

  server.registerTool("get_instructor_courses", {
    title: "List courses taught by a UNT instructor",
    description: "List courses associated with an exact instructor name in the deployed grade data. Use get_course_grades for section details.",
    inputSchema: z.object({
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      ...paging,
    }),
    annotations: { readOnlyHint: true },
  }, async ({ firstName, lastName, offset, limit }) =>
    result(await gradeData.getInstructorCourses(firstName, lastName, offset, limit))
  );
}, {
  serverInfo: { name: "unt-grades", version: "0.1.0" },
  instructions: "Read-only UNT course and instructor grade data. Search for a course or instructor, then request course distributions. Paths in results are relative to this server's origin.",
});

export { handler as GET };

export async function POST(request: Request) {
  let message: unknown;
  try {
    message = await readBoundedJson(request, 32 * 1024);
    // Legacy SDK batching permits up to 100 tool calls for one HTTP quota slot.
    // Modern Streamable HTTP clients send one JSON-RPC message per request.
    if (Array.isArray(message)) throw new RequestBodyError("MCP batch requests are not supported. Send one message per request.", 400);
  } catch (error) {
    return requestBodyErrorResponse(error);
  }

  // The incoming body is consumed now. Construct from fields rather than
  // copying that Request: hosted runtimes can reject a consumed request input.
  // JSON reserialization also makes the original Content-Length stale.
  const headers = new Headers(request.headers);
  headers.delete("Content-Length");
  return handler(new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(message),
    signal: request.signal,
  }));
}
