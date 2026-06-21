-- Speed up backend API lookups that use prefix/number startsWith filters and
-- instructor section grouping/sorting.

CREATE INDEX IF NOT EXISTS idx_courses_prefix_number_pattern
  ON courses (prefix text_pattern_ops, number text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_sections_instructor_course_section
  ON sections (instructor_id, course_id, section_number);
