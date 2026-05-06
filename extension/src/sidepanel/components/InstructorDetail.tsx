import { useEffect } from "react";
import { calculateGPA, aggregateGrades, toChartData } from "../../lib/grades";
import type { GradeData } from "../../lib/grades";
import GpaBadge from "./GpaBadge";
import GradeChart from "./GradeChart";
import SectionCard from "./SectionCard";
import { useDetail } from "../../hooks/useDetail";
import type { Section, SectionCourse } from "../../lib/types";

interface InstructorDetailProps {
  id: number;
  onBack: () => void;
  onCourseSelect: (prefix: string, number: string) => void;
}

export default function InstructorDetail({ id, onBack, onCourseSelect }: InstructorDetailProps) {
  const { instructorData, loading, error, fetchInstructor } = useDetail();

  useEffect(() => {
    fetchInstructor(id);
  }, [id, fetchInstructor]);

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: "#999" }}>Loading...</div>;
  if (error) return <div style={{ padding: 24, textAlign: "center", color: "#c62828" }}>{error}</div>;
  if (!instructorData) return null;

  const { instructor, sections } = instructorData;
  const overallAggregate = aggregateGrades(sections as GradeData[]);
  const overallGPA = calculateGPA(overallAggregate);
  const chartData = toChartData(overallAggregate);

  const courseMap = new Map<number, { course: SectionCourse; secs: Section[] }>();
  for (const section of sections) {
    if (!section.course) continue;
    const existing = courseMap.get(section.courseId);
    if (existing) {
      existing.secs.push(section);
    } else {
      courseMap.set(section.courseId, { course: section.course, secs: [section] });
    }
  }
  const courseGroups = Array.from(courseMap.values());

  return (
    <div>
      <button
        onClick={onBack}
        style={{ border: "none", background: "none", cursor: "pointer", fontSize: "13px", color: "#1B5E20", padding: 0, marginBottom: 8 }}
      >
        &larr; Back to search
      </button>

      <div style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px 0", color: "#1B5E20" }}>
          {instructor.firstName} {instructor.lastName}
        </h1>
        <div style={{ marginTop: 6, display: "flex", gap: 12, fontSize: 12, color: "#666", alignItems: "center" }}>
          <span>Overall GPA: <GpaBadge gpa={overallGPA} /></span>
          <span>{sections.length} sections</span>
          <span>{courseGroups.length} course{courseGroups.length !== 1 ? "s" : ""} taught</span>
        </div>
      </div>

      <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, border: "1px solid #e0e0e0", background: "#fafafa" }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px 0" }}>Aggregate Grade Distribution</h2>
        <GradeChart data={chartData} height={200} />
      </div>

      <a
        href={`https://www.untgrades.app/instructor/${instructor.id}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-block", marginBottom: 12, fontSize: 13, color: "#1B5E20", textDecoration: "none" }}
      >
        View full page on untgrades.app &#8599;
      </a>

      {courseGroups.map(({ course, secs }) => (
        <div key={course.id} style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px 0" }}>
            <button
              onClick={() => onCourseSelect(course.prefix, course.number)}
              style={{ border: "none", background: "none", cursor: "pointer", color: "#1B5E20", padding: 0, font: "inherit" }}
            >
              {course.prefix} {course.number}
            </button>
            <span style={{ color: "#777", marginLeft: 6 }}>&mdash; {course.title}</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {secs.map((section) => (
              <SectionCard
                key={section.id}
                section={section as GradeData & { sectionNumber: string; instructorId: number; course: { prefix: string; number: string; title: string } }}
                showCourse={false}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
