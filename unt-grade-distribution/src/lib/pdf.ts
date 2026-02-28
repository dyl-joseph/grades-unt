import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CartItem } from "@/lib/types";

/**
 * Generate a PDF table from cart items and trigger a browser download.
 */
export function downloadCartPDF(items: CartItem[]) {
  const doc = new jsPDF({ orientation: "landscape" });

  // Title
  doc.setFontSize(20);
  doc.setTextColor(27, 94, 32); // #1B5E20 — UNT green / jungle primary
  doc.text("UNT Grade Distribution — My Courses", 14, 18);

  // Subtitle
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 25);

  // Table rows
  const body = items.map((item) => {
    const pct = (n: number) =>
      item.totalEnroll > 0
        ? `${Math.round((n / item.totalEnroll) * 1000) / 10}%`
        : "—";
    return [
      `${item.prefix} ${item.number}`,
      item.title,
      item.gpa !== null ? item.gpa.toFixed(2) : "N/A",
      item.sectionCount.toString(),
      item.totalEnroll.toLocaleString(),
      pct(item.gradeA),
      pct(item.gradeB),
      pct(item.gradeC),
      pct(item.gradeD),
      pct(item.gradeF),
      pct(item.gradeW),
    ];
  });

  autoTable(doc, {
    startY: 30,
    head: [
      [
        "Course",
        "Title",
        "GPA",
        "Sections",
        "Enrolled",
        "%A",
        "%B",
        "%C",
        "%D",
        "%F",
        "%W",
      ],
    ],
    body,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [27, 94, 32], // jungle primary
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [232, 245, 233] }, // green-50
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 28 },
      1: { cellWidth: 55 },
      2: { halign: "center", cellWidth: 18 },
      3: { halign: "center", cellWidth: 20 },
      4: { halign: "center", cellWidth: 22 },
    },
  });

  doc.save("unt-grades-my-courses.pdf");
}
