-- Add trigram indexes for search/title/name contains queries.
-- These indexes support the search API's %...% lookups without changing query semantics.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_courses_title_trgm
  ON courses
  USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_instructors_first_name_trgm
  ON instructors
  USING GIN (first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_instructors_last_name_trgm
  ON instructors
  USING GIN (last_name gin_trgm_ops);
