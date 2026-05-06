import { calculateGPA, toChartData } from "../../lib/grades";
import type { GradeData } from "../../lib/grades";
import GpaBadge from "./GpaBadge";
import GradeChart from "./GradeChart";

interface SectionCardProps {
  section: GradeData & {
    sectionNumber: string;
    instructorId: number;
    instructor?: { id: number; firstName: string; lastName: string };
    course?: { prefix: string; number: string; title: string };
  };
  showCourse?: boolean;
  onInstructorClick?: (id: number) => void;
}

export default function SectionCard({ section, showCourse = false, onInstructorClick }: SectionCardProps) {
  const gpa = calculateGPA(section);
  const chartData = toChartData(section);

  return (
    <div style={{
      borderRadius: 8,
      border: "1px solid #e0e0e0",
      padding: 10,
      background: "#fafafa",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          {showCourse && section.course && (
            <div style={{ fontSize: 12, fontWeight: 500, color: "#1B5E20" }}>
              {section.course.prefix} {section.course.number}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#555" }}>
            <span>Section {section.sectionNumber}</span>
            {section.instructor && (
              <>
                <span style={{ color: "#ccc" }}>&middot;</span>
                <button
                  onClick={() => onInstructorClick?.(section.instructor!.id)}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "#333", padding: 0, font: "inherit", fontSize: "inherit" }}
                >
                  {section.instructor.lastName}, {section.instructor.firstName}
                </button>
              </>
            )}
          </div>
        </div>
        <GpaBadge gpa={gpa} />
      </div>
      <GradeChart data={chartData} height={120} />
      <div style={{ textAlign: "right", fontSize: 10, color: "#999", marginTop: 2 }}>
        {section.totalEnroll} students
      </div>
    </div>
  );
}
