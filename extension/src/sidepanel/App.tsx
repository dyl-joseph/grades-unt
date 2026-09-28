import { lazy, Suspense, useState, useCallback } from "react";
import SearchView from "./components/SearchView";

const CourseDetail = lazy(() => import("./components/CourseDetail"));
const InstructorDetail = lazy(() => import("./components/InstructorDetail"));

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
      <Suspense
        fallback={
          <div style={{ padding: 24, textAlign: "center", color: "#999" }}>
            Loading...
          </div>
        }
      >
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
      </Suspense>
    </div>
  );
}
