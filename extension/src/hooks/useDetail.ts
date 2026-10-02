import { useState, useCallback, useRef } from "react";
import type { CourseDetailResponse, InstructorDetailResponse, ExtensionResponse } from "../lib/types";

export function useDetail() {
  const [courseData, setCourseData] = useState<CourseDetailResponse | null>(null);
  const [instructorData, setInstructorData] = useState<InstructorDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the most recent request may update state; earlier ones can resolve late.
  const latestRequest = useRef(0);

  const fetchCourse = useCallback(async (prefix: string, number: string) => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError(null);
    setInstructorData(null);
    try {
      const response: ExtensionResponse = await chrome.runtime.sendMessage({
        type: "COURSE_DETAIL",
        payload: { prefix, number },
      });
      if (requestId !== latestRequest.current) return;
      if (!response.ok) throw new Error(response.error ?? "Failed to load course");
      setCourseData(response.data as CourseDetailResponse);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError(err instanceof Error ? err.message : "Failed to load course");
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, []);

  const fetchInstructor = useCallback(async (id: number) => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError(null);
    setCourseData(null);
    try {
      const response: ExtensionResponse = await chrome.runtime.sendMessage({
        type: "INSTRUCTOR_DETAIL",
        payload: { id: String(id) },
      });
      if (requestId !== latestRequest.current) return;
      if (!response.ok) throw new Error(response.error ?? "Failed to load instructor");
      setInstructorData(response.data as InstructorDetailResponse);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError(err instanceof Error ? err.message : "Failed to load instructor");
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, []);

  return { courseData, instructorData, loading, error, fetchCourse, fetchInstructor };
}
