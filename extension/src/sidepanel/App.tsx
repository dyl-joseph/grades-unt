import { useState, useCallback } from "react";
import SearchView from "./components/SearchView";
import CourseDetail from "./components/CourseDetail";
import InstructorDetail from "./components/InstructorDetail";

type View =
  | { type: "search" }
  | { type: "course"; prefix: string; number: string }
  | { type: "instructor"; id: number };

export default function App() {
  const [view, setView] = useState<View>({ type: "search" });

  const goToCourse = useCallback((prefix: string, number: string) => {
    setView({ type: "course", prefix, number });
  }, []);

  const goToInstructor = useCallback((id: number) => {
    setView({ type: "instructor", id });
  }, []);

  const goToSearch = useCallback(() => {
    setView({ type: "search" });
  }, []);

  return (
    <div style={{ width: "100%", minHeight: "100vh", padding: "12px", boxSizing: "border-box" }}>
      {view.type === "search" && (
        <SearchView onCourseSelect={goToCourse} onInstructorSelect={goToInstructor} />
      )}
      {view.type === "course" && (
        <CourseDetail
          prefix={view.prefix}
          number={view.number}
          onBack={goToSearch}
          onInstructorSelect={goToInstructor}
        />
      )}
      {view.type === "instructor" && (
        <InstructorDetail
          id={view.id}
          onBack={goToSearch}
          onCourseSelect={goToCourse}
        />
      )}
    </div>
  );
}
