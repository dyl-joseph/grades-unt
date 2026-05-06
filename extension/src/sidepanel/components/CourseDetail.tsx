import { calculateGPA, aggregateGrades, toChartData } from "../../lib/grades";
import type { GradeData } from "../../lib/grades";
import GpaBadge from "./GpaBadge";
import GradeChart from "./GradeChart";
import SectionCard from "./SectionCard";
import { useDetail } from "../../hooks/useDetail";
import { useEffect } from "react";

interface CourseDetailProps {
  prefix: string;
  number: string;
  onBack: () => void;
  onInstructorSelect: (id: number) => void;
}

export default function CourseDetail({ prefix, number, onBack, onInstructorSelect }: CourseDetailProps) {
  const { courseData, loading, error, fetchCourse } = useDetail();

  useEffect(() => {
    fetchCourse(prefix.toUpperCase(), number);
  }, [prefix, number, fetchCourse]);

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: "#999" }}>Loading...</div>;
  if (error) return <div style={{ padding: 24, textAlign: "center", color: "#c62828" }}>{error}</div>;
  if (!courseData) return null;

  const { course, sections } = courseData;
  const aggregate = aggregateGrades(sections as GradeData[]);
  const overallGPA = calculateGPA(aggregate);
  const chartData = toChartData(aggregate);

  return (
    <div>
      <button
        onClick={onBack}
        style={{ border: "none", background: "none", cursor: "pointer", fontSize: "13px", color: "#1B5E20", padding: 0, marginBottom: 8 }}
      >
        ← Back to search
      </button>

      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px 0", color: "#1B5E20" }}>
          {course.prefix} {course.number}
        </h1>
        <p style={{ fontSize: 14, color: "#555", margin: 0 }}>{course.title}</p>
        <div style={{ marginTop: 6, display: "flex", gap: 12, fontSize: 12, color: "#666", alignItems: "center" }}>
          <span>Overall GPA: <GpaBadge gpa={overallGPA} /></span>
          <span>{sections.length} sections</span>
          <span>{aggregate.totalEnroll.toLocaleString()} students</span>
        </div>
      </div>

      <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, border: "1px solid #e0e0e0", background: "#fafafa" }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px 0" }}>Aggregate Grade Distribution</h2>
        <GradeChart data={chartData} height={200} />
      </div>

      <a
        href={`https://www.untgrades.app/course/${course.prefix}/${course.number}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-block", marginBottom: 12, fontSize: 13, color: "#1B5E20", textDecoration: "none" }}
      >
        View full page on untgrades.app ↗
      </a>

      <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px 0" }}>Sections</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section as GradeData & { sectionNumber: string; instructorId: number; instructor?: { id: number; firstName: string; lastName: string } }}
            onInstructorClick={onInstructorSelect}
          />
        ))}
      </div>
    </div>
  );
}
