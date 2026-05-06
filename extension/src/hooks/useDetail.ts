import { useState, useCallback } from "react";
import type { CourseDetailResponse, InstructorDetailResponse, ExtensionResponse } from "../lib/types";

export function useDetail() {
  const [courseData, setCourseData] = useState<CourseDetailResponse | null>(null);
  const [instructorData, setInstructorData] = useState<InstructorDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCourse = useCallback(async (prefix: string, number: string) => {
    setLoading(true);
    setError(null);
    setInstructorData(null);
    try {
      const response: ExtensionResponse = await chrome.runtime.sendMessage({
        type: "COURSE_DETAIL",
        payload: { prefix, number },
      });
      if (!response.ok) throw new Error(response.error ?? "Failed to load course");
      setCourseData(response.data as CourseDetailResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load course");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInstructor = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    setCourseData(null);
    try {
      const response: ExtensionResponse = await chrome.runtime.sendMessage({
        type: "INSTRUCTOR_DETAIL",
        payload: { id: String(id) },
      });
      if (!response.ok) throw new Error(response.error ?? "Failed to load instructor");
      setInstructorData(response.data as InstructorDetailResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load instructor");
    } finally {
      setLoading(false);
    }
  }, []);

  return { courseData, instructorData, loading, error, fetchCourse, fetchInstructor };
}
