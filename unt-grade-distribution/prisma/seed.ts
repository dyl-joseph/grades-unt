import "dotenv/config";
import { parse } from "csv-parse/sync";
import pg from "pg";
import fs from "fs";
import path from "path";

/**
 * Seed script using raw pg client (no Prisma transactions needed).
 * Works reliably through PgBouncer / Supabase pooler.
 */
async function main() {
  const client = new pg.Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    connectionTimeoutMillis: 30000,
    query_timeout: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });
  await client.connect();
  console.log("Connected to database. URL:", (process.env.DIRECT_URL || process.env.DATABASE_URL)?.replace(/:[^:@]+@/, ':***@'));

  const dataDir = path.join(__dirname, "data");
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".csv"));

  if (files.length === 0) {
    console.log("No CSV files found in prisma/data/");
    await client.end();
    return;
  }

  for (const file of files) {
    const content = fs.readFileSync(path.join(dataDir, file), "utf-8");
    const records: Record<string, string>[] = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`Processing ${records.length} rows from ${file}...`);

    // In-memory caches to avoid repeated DB lookups
    const courseCache = new Map<string, number>();
    const instructorCache = new Map<string, number>();

    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      // 1. Parse course name  "AARS 6840 - ORG AGING & HEALTH"
      const courseName = row["COURSE NAME"];
      const [prefixNumber, ...titleParts] = courseName.split(" - ");
      const title = titleParts.join(" - ").trim() || prefixNumber;
      const match = prefixNumber.match(/^([A-Z]+)\s+(.+)$/);
      const prefix = match ? match[1] : prefixNumber;
      const number = match ? match[2].trim() : "";

      // 2. Parse teacher name  "Moore,Ami R"
      const teacherName = row["TEACHER NAME"];
      const commaIdx = teacherName.indexOf(",");
      const lastName =
        commaIdx > -1
          ? teacherName.substring(0, commaIdx).trim()
          : teacherName.trim() || "Staff";
      const firstName =
        commaIdx > -1
          ? teacherName.substring(commaIdx + 1).trim()
          : "";

      // 3. Parse grades
      const gradeA = Math.round(parseFloat(row["A"]) || 0);
      const gradeB = Math.round(parseFloat(row["B"]) || 0);
      const gradeC = Math.round(parseFloat(row["C"]) || 0);
      const gradeD = Math.round(parseFloat(row["D"]) || 0);
      const gradeF = Math.round(parseFloat(row["F"]) || 0);
      const gradeP = Math.round(parseFloat(row["P"]) || 0);
      const gradeNP = Math.round(parseFloat(row["NP"]) || 0);
      const gradeW = Math.round(parseFloat(row["W"]) || 0);
      const gradeI = Math.round(parseFloat(row["I"]) || 0);
      const totalEnroll =
        gradeA + gradeB + gradeC + gradeD + gradeF +
        gradeP + gradeNP + gradeW + gradeI;

      // 4. Upsert course (cached)
      const courseKey = `${prefix}|${number}`;
      let courseId = courseCache.get(courseKey);
      if (!courseId) {
        const res = await client.query(
          `INSERT INTO courses (prefix, number, title)
           VALUES ($1, $2, $3)
           ON CONFLICT (prefix, number) DO UPDATE SET title = EXCLUDED.title
           RETURNING id`,
          [prefix, number, title]
        );
        courseId = res.rows[0].id;
        courseCache.set(courseKey, courseId);
      }

      // 5. Upsert instructor (cached)
      const instrKey = `${firstName}|${lastName}`;
      let instructorId = instructorCache.get(instrKey);
      if (!instructorId) {
        const res = await client.query(
          `INSERT INTO instructors (first_name, last_name)
           VALUES ($1, $2)
           ON CONFLICT (first_name, last_name) DO UPDATE SET first_name = EXCLUDED.first_name
           RETURNING id`,
          [firstName, lastName]
        );
        instructorId = res.rows[0].id;
        instructorCache.set(instrKey, instructorId);
      }

      // 6. Upsert section
      await client.query(
        `INSERT INTO sections (section_number, course_id, instructor_id,
           grade_a, grade_b, grade_c, grade_d, grade_f,
           grade_p, grade_np, grade_w, grade_i, total_enroll)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (course_id, section_number)
         DO UPDATE SET instructor_id=EXCLUDED.instructor_id,
           grade_a=EXCLUDED.grade_a, grade_b=EXCLUDED.grade_b,
           grade_c=EXCLUDED.grade_c, grade_d=EXCLUDED.grade_d,
           grade_f=EXCLUDED.grade_f, grade_p=EXCLUDED.grade_p,
           grade_np=EXCLUDED.grade_np, grade_w=EXCLUDED.grade_w,
           grade_i=EXCLUDED.grade_i, total_enroll=EXCLUDED.total_enroll`,
        [
          row["SECTION NUMBER"].toString(), courseId, instructorId,
          gradeA, gradeB, gradeC, gradeD, gradeF,
          gradeP, gradeNP, gradeW, gradeI, totalEnroll,
        ]
      );

      if ((i + 1) % 100 === 0 || i === records.length - 1) {
        console.log(`  ${i + 1} / ${records.length}`);
      }
    }

    console.log(`✓ Seeded ${records.length} rows from ${file}`);
  }

  await client.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
